from typing import Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import (
    Session as DBSession, Event, UserProfile, Recommendation, SessionPrediction
)
from backend.services.user_profiling import UserProfilingService
from backend.services.intent_detector import IntentDetector
from backend.services.friction_engine import FrictionEngine
from backend.services.abandonment_engine import AbandonmentEngine
from backend.services.recommendation_engine import RecommendationEngine
from backend.services.contextual_guidance import ContextualGuidanceService
from backend.services.session_quality import SessionQualityEngine

class SessionIntelligenceService:
    """
    Unified Session Intelligence Pipeline.
    Orchestrates end-to-end evaluation upon every ingested event.
    """
    
    @classmethod
    def process_event(
        cls,
        db: Session,
        session_id: str,
        event: Event
    ) -> Dict[str, Any]:
        """
        Processes a newly ingested event through the full PULSYNC intelligence pipeline.
        """
        # 1. Fetch Session
        session = db.query(DBSession).filter(DBSession.id == session_id).first()
        if not session:
            session = DBSession(
                id=session_id,
                user_id=event.user_id,
                started_at=event.timestamp or datetime.utcnow(),
                is_synthetic=False,
                status="ACTIVE"
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            
        # 2. Update session counters
        all_events = db.query(Event).filter(Event.session_id == session_id).order_by(Event.timestamp.asc()).all()
        session.total_events = len(all_events)
        session.total_actions = sum(1 for e in all_events if e.action)
        sports = set(e.sport for e in all_events if e.sport)
        session.unique_sports = len(sports)
        
        if all_events:
            session_duration_sec = (all_events[-1].timestamp - all_events[0].timestamp).total_seconds()
            session.duration_seconds = max(0.0, session_duration_sec)
            session.ended_at = all_events[-1].timestamp
        else:
            session_duration_sec = 0.0
            
        # 3. User Profiling
        user = None
        if session.user_id:
            user = UserProfilingService.update_profile(db, session.user_id)
            
        # 4. Intent Detection
        intent, intent_conf, intent_reason = IntentDetector.detect_intent(all_events)
        session.intent = intent
        session.intent_confidence = intent_conf
        
        # 5. Friction Detection
        friction_score, friction_level, friction_reason = FrictionEngine.calculate_friction(all_events)
        session.friction_score = friction_score
        session.friction_level = friction_level
        
        # 6. Abandonment Risk
        abandonment_prob, risk_level, abandonment_reason = AbandonmentEngine.calculate_risk(
            all_events, session.duration_seconds, friction_score
        )
        session.abandonment_probability = abandonment_prob
        
        # 7. Session Quality
        quality_score, quality_reason = SessionQualityEngine.evaluate_quality(
            all_events, friction_score, abandonment_prob
        )
        session.session_quality_score = quality_score
        
        # 8. Transaction Intent, Information Interest & Engagement State
        transaction_intent = "HIGH" if intent == "ACT" else "LOW"
        is_exiting = any(e.event_type and "dismiss" in e.event_type.lower() for e in all_events) or abandonment_prob > 0.85
        information_interest = "LOW" if is_exiting else "HIGH"

        if transaction_intent == "LOW" and information_interest == "LOW":
            engagement_state = "RESPECT_EXIT"
        elif transaction_intent == "LOW" and information_interest == "HIGH":
            engagement_state = "VALUE_SEEKING"
        else:
            engagement_state = "INFORMATIONAL"

        hist_profile = UserProfilingService.get_historical_player_profile(db, session.user_id) if session.user_id else None

        # 9. Recommendation Generation & Ranking
        previous_recs = db.query(Recommendation).filter(Recommendation.session_id == session_id).all()
        recommendations = RecommendationEngine.generate_recommendations(
            session=session,
            user=user,
            events=all_events,
            current_intent=intent,
            friction_level=friction_level,
            abandonment_probability=abandonment_prob,
            previous_recommendations=previous_recs,
            transaction_intent=transaction_intent,
            information_interest=information_interest,
            engagement_state=engagement_state
        )
        
        top_rec = recommendations[0] if recommendations else None
        
        # Persist top recommendations into DB if new
        if top_rec:
            existing = db.query(Recommendation).filter(
                Recommendation.session_id == session_id,
                Recommendation.content_id == top_rec["content_id"]
            ).first()
            if not existing:
                db_rec = Recommendation(
                    session_id=session_id,
                    content_id=top_rec["content_id"],
                    content_type=top_rec["content_type"],
                    title=top_rec["title"],
                    reason=top_rec["reason"],
                    rank=top_rec["rank"],
                    score=top_rec["score"],
                    shown_at=datetime.utcnow()
                )
                db.add(db_rec)
                
        # 10. Contextual Guidance Decision
        guidance = ContextualGuidanceService.evaluate_intervention(
            intent=intent,
            friction_level=friction_level,
            abandonment_probability=abandonment_prob,
            top_recommendation=top_rec
        )
        
        # 11. Persist Session Prediction Snapshot
        pred = SessionPrediction(
            session_id=session_id,
            intent=intent,
            intent_confidence=intent_conf,
            abandonment_probability=abandonment_prob,
            friction_score=friction_score,
            quality_score=quality_score,
            created_at=datetime.utcnow()
        )
        db.add(pred)
        
        db.commit()
        db.refresh(session)
        
        return {
            "session_id": session_id,
            "user_id": session.user_id,
            "intent": intent,
            "intent_confidence": intent_conf,
            "intent_reason": intent_reason,
            "transaction_intent": transaction_intent,
            "information_interest": information_interest,
            "engagement_state": engagement_state,
            "abandonment_probability": abandonment_prob,
            "abandonment_risk_level": risk_level,
            "abandonment_reason": abandonment_reason,
            "friction_score": friction_score,
            "friction_level": friction_level,
            "friction_reason": friction_reason,
            "session_quality_score": quality_score,
            "session_quality_explanation": quality_reason,
            "guidance": guidance,
            "top_recommendation": top_rec,
            "recommendations": recommendations[:5],
            "historical_profile": hist_profile
        }

    @classmethod
    def get_intelligence(cls, db: Session, session_id: str) -> Dict[str, Any]:
        """Reads latest intelligence state for a given session."""
        session = db.query(DBSession).filter(DBSession.id == session_id).first()
        if not session:
            return None
            
        all_events = db.query(Event).filter(Event.session_id == session_id).order_by(Event.timestamp.asc()).all()
        user = db.query(UserProfile).filter(UserProfile.id == session.user_id).first() if session.user_id else None
        
        intent, intent_conf, intent_reason = IntentDetector.detect_intent(all_events)
        friction_score, friction_level, friction_reason = FrictionEngine.calculate_friction(all_events)
        abandonment_prob, risk_level, abandonment_reason = AbandonmentEngine.calculate_risk(
            all_events, session.duration_seconds, friction_score
        )
        quality_score, quality_reason = SessionQualityEngine.evaluate_quality(
            all_events, friction_score, abandonment_prob
        )
        
        transaction_intent = "HIGH" if intent == "ACT" else "LOW"
        is_exiting = any(e.event_type and "dismiss" in e.event_type.lower() for e in all_events) or abandonment_prob > 0.85
        information_interest = "LOW" if is_exiting else "HIGH"

        if transaction_intent == "LOW" and information_interest == "LOW":
            engagement_state = "RESPECT_EXIT"
        elif transaction_intent == "LOW" and information_interest == "HIGH":
            engagement_state = "VALUE_SEEKING"
        else:
            engagement_state = "INFORMATIONAL"

        hist_profile = UserProfilingService.get_historical_player_profile(db, session.user_id) if session.user_id else None

        previous_recs = db.query(Recommendation).filter(Recommendation.session_id == session_id).all()
        recommendations = RecommendationEngine.generate_recommendations(
            session=session,
            user=user,
            events=all_events,
            current_intent=intent,
            friction_level=friction_level,
            abandonment_probability=abandonment_prob,
            previous_recommendations=previous_recs,
            transaction_intent=transaction_intent,
            information_interest=information_interest,
            engagement_state=engagement_state
        )
        top_rec = recommendations[0] if recommendations else None
        
        guidance = ContextualGuidanceService.evaluate_intervention(
            intent=intent,
            friction_level=friction_level,
            abandonment_probability=abandonment_prob,
            top_recommendation=top_rec
        )
        
        return {
            "session_id": session_id,
            "user_id": session.user_id,
            "intent": intent,
            "intent_confidence": intent_conf,
            "intent_reason": intent_reason,
            "transaction_intent": transaction_intent,
            "information_interest": information_interest,
            "engagement_state": engagement_state,
            "abandonment_probability": abandonment_prob,
            "abandonment_risk_level": risk_level,
            "abandonment_reason": abandonment_reason,
            "friction_score": friction_score,
            "friction_level": friction_level,
            "friction_reason": friction_reason,
            "session_quality_score": quality_score,
            "session_quality_explanation": quality_reason,
            "guidance": guidance,
            "top_recommendation": top_rec,
            "recommendations": recommendations[:5],
            "historical_profile": hist_profile
        }
