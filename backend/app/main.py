import uuid
import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import engine, get_db
from backend.models import (
    Base, UserProfile, Session as DBSession, Event, Match, Recommendation, Outcome
)
from backend.schemas import (
    AgeVerificationRequest, AgeVerificationResponse,
    SelfExclusionRequest, SelfExclusionResponse,
    UserCreate, UserResponse,
    SessionCreate, SessionResponse,
    EventCreate, SessionIntelligenceResponse,
    RecommendationListResponse, RecommendationItem, RecommendationFeedbackRequest,
    OutcomeCreate, OutcomeResponse,
    MatchResponse,
    DashboardMetricsResponse, DashboardSegmentsResponse,
    DashboardRecommendationsResponse, DashboardQualityResponse, DashboardImpactResponse,
    DemoStartRequest
)
from backend.services.user_profiling import UserProfilingService
from backend.services.session_intelligence import SessionIntelligenceService
from backend.services.dashboard_service import DashboardAnalyticsService
from backend.services.demo_service import DemoSimulationService

# Initialize database schema if not already present
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="PULSYNC: AI-Powered Session Intelligence & Contextual Guidance Platform"
)

# CORS Configuration allowing Vue and Next Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================================================
# Root & Health Endpoints
# ==================================================
@app.get("/", tags=["System"])
def read_root():
    return {"message": "Welcome to PULSYNC API"}

@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint validating API and database connectivity."""
    try:
        user_count = db.query(UserProfile).count()
        return {
            "status": "healthy",
            "service": "PULSYNC API",
            "version": settings.VERSION,
            "database": "connected",
            "users_in_db": user_count,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error: {str(e)}"
        )

# ==================================================
# Compliance MVP (Mock Integrations)
# ==================================================
@app.post("/api/compliance/age-verification", response_model=AgeVerificationResponse, tags=["Compliance"])
def verify_age(payload: AgeVerificationRequest, db: Session = Depends(get_db)):
    """Simulated mock age verification for MVP compliance demonstration."""
    uid = payload.user_id
    if uid:
        user = db.query(UserProfile).filter(UserProfile.id == uid).first()
        if user:
            user.age_verified = True
            db.commit()
    return AgeVerificationResponse(
        user_id=uid,
        is_verified=True,
        verified=True,
        minimum_age=18,
        status="VERIFIED_AGE_OVER_18"
    )

@app.post("/api/compliance/self-exclusion-check", response_model=SelfExclusionResponse, tags=["Compliance"])
def check_self_exclusion(payload: SelfExclusionRequest, db: Session = Depends(get_db)):
    """Simulated mock self-exclusion registry check for MVP compliance."""
    uid = payload.user_id or payload.anonymous_user_id
    is_excluded = False
    if uid:
        user = db.query(UserProfile).filter(
            (UserProfile.id == uid) | (UserProfile.anonymous_id == uid)
        ).first()
        is_excluded = user.self_excluded if user else False
    return SelfExclusionResponse(
        user_id=uid,
        self_excluded=is_excluded,
        eligible=not is_excluded,
        status="ACTIVE_NOT_EXCLUDED" if not is_excluded else "EXCLUDED"
    )

# ==================================================
# Users Endpoints
# ==================================================
@app.post("/api/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, tags=["Users"])
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    """Register or initialize a user profile."""
    uid = payload.id or f"usr_{uuid.uuid4().hex[:8]}"
    existing = db.query(UserProfile).filter(UserProfile.id == uid).first()
    if existing:
        return UserProfilingService.get_user_summary(db, existing.id)
        
    user = UserProfile(
        id=uid,
        anonymous_id=payload.anonymous_id or f"anon_{uuid.uuid4().hex[:10]}",
        segment=payload.segment or "Casual Explorer"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserProfilingService.get_user_summary(db, user.id)

@app.get("/api/users/{id}", response_model=UserResponse, tags=["Users"])
def get_user(id: str, db: Session = Depends(get_db)):
    """Fetch user profile and behavioral segmentation."""
    user = db.query(UserProfile).filter(UserProfile.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfilingService.get_user_summary(db, user.id)

# ==================================================
# Sessions Endpoints
# ==================================================
@app.post("/api/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED, tags=["Sessions"])
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    """Initialize a new user session."""
    sid = payload.id or payload.session_id or f"sess_{uuid.uuid4().hex[:10]}"
    uid = payload.user_id or payload.anonymous_user_id
    
    existing = db.query(DBSession).filter(DBSession.id == sid).first()
    if existing:
        existing.session_id = existing.id
        return existing
        
    if uid:
        UserProfilingService.get_or_create_user(db, uid, anonymous_id=payload.anonymous_user_id)
        
    session = DBSession(
        id=sid,
        user_id=uid,
        started_at=datetime.datetime.utcnow(),
        is_synthetic=payload.is_synthetic,
        status="ACTIVE"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    session.session_id = session.id
    return session

@app.get("/api/sessions/{id}", response_model=SessionResponse, tags=["Sessions"])
def get_session(id: str, db: Session = Depends(get_db)):
    """Retrieve session state and metrics."""
    session = db.query(DBSession).filter(DBSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.session_id = session.id
    return session

# ==================================================
# Events & Realtime Intelligence
# ==================================================
@app.post("/api/sessions/{id}/events", response_model=SessionIntelligenceResponse, tags=["Events & Intelligence"])
def ingest_event(id: str, payload: EventCreate, db: Session = Depends(get_db)):
    """
    Ingests live frontend telemetry event and immediately triggers the unified Session Intelligence pipeline.
    """
    session = db.query(DBSession).filter(DBSession.id == id).first()
    if not session:
        session = DBSession(
            id=id,
            user_id=payload.user_id,
            started_at=payload.timestamp or datetime.datetime.utcnow(),
            is_synthetic=False,
            status="ACTIVE"
        )
        db.add(session)
        db.commit()
        
    user_id = payload.user_id or session.user_id
    if user_id:
        UserProfilingService.get_or_create_user(db, user_id)
        
    event = Event(
        session_id=id,
        user_id=user_id,
        timestamp=payload.timestamp or datetime.datetime.utcnow(),
        event_type=payload.event_type,
        page=payload.page,
        action=payload.action,
        sport=payload.sport,
        match_id=payload.match_id
    )
    if payload.metadata:
        event.set_metadata(payload.metadata)
        
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # Process through unified intelligence pipeline
    intel = SessionIntelligenceService.process_event(db, id, event)
    
    # Expose nested intelligence format expected by frontend client
    intel["intelligence"] = {
        "intent": {
            "label": intel["intent"],
            "confidence": intel["intent_confidence"],
            "reason": intel["intent_reason"]
        },
        "abandonment": {
            "probability": intel["abandonment_probability"],
            "risk": intel["abandonment_risk_level"],
            "reason": intel["abandonment_reason"]
        },
        "friction": {
            "score": intel["friction_score"],
            "level": intel["friction_level"],
            "reason": intel["friction_reason"]
        },
        "recommendations": intel["recommendations"],
        "guidance": {
            "show": intel["guidance"]["should_intervene"],
            "message": intel["guidance"]["guidance_message"],
            "action": intel["guidance"]["recommended_action"],
            "content_id": intel["guidance"]["content_id"]
        },
        "session_quality": {
            "score": intel["session_quality_score"],
            "explanation": intel["session_quality_explanation"]
        }
    }
    return intel

@app.get("/api/sessions/{id}/intelligence", response_model=SessionIntelligenceResponse, tags=["Events & Intelligence"])
def get_session_intelligence(id: str, db: Session = Depends(get_db)):
    """Get current session intelligence (intent, friction, abandonment, guidance)."""
    intel = SessionIntelligenceService.get_intelligence(db, id)
    if not intel:
        raise HTTPException(status_code=404, detail="Session not found or has no activity.")
    return intel

# ==================================================
# Matches
# ==================================================
@app.get("/api/matches", response_model=List[MatchResponse], tags=["Matches"])
def list_matches(sport: Optional[str] = None, db: Session = Depends(get_db)):
    """List available matches with optional sport filter."""
    query = db.query(Match)
    if sport:
        query = query.filter(Match.sport.ilike(f"%{sport}%"))
    matches = query.limit(20).all()
    if not matches:
        now = datetime.datetime.utcnow()
        sample_matches = [
            Match(id="match_el_clasico", sport="Football", team_home="Real Madrid", team_away="FC Barcelona", start_time=now + datetime.timedelta(hours=3), status="UPCOMING"),
            Match(id="match_mci_ars", sport="Football", team_home="Manchester City", team_away="Arsenal", start_time=now + datetime.timedelta(hours=5), status="UPCOMING"),
            Match(id="match_lal_gsw", sport="Basketball", team_home="LA Lakers", team_away="Golden State Warriors", start_time=now + datetime.timedelta(hours=7), status="UPCOMING"),
            Match(id="match_alcaraz_sinner", sport="Tennis", team_home="Carlos Alcaraz", team_away="Jannik Sinner", start_time=now + datetime.timedelta(hours=1), status="LIVE")
        ]
        db.add_all(sample_matches)
        db.commit()
        matches = sample_matches
    return matches

@app.get("/api/matches/{id}", response_model=MatchResponse, tags=["Matches"])
def get_match(id: str, db: Session = Depends(get_db)):
    """Get match details."""
    match = db.query(Match).filter(Match.id == id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

# ==================================================
# Recommendations & Feedback
# ==================================================
@app.get("/api/recommendations/{session_id}", response_model=RecommendationListResponse, tags=["Recommendations"])
def get_recommendations(session_id: str, db: Session = Depends(get_db)):
    """
    Returns ranked, explainable next-best informational content recommendations.
    STRICTLY NON-GAMBLING: Recommends insights, comparisons, form, rules, and statistics.
    """
    intel = SessionIntelligenceService.get_intelligence(db, session_id)
    if not intel:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    user = db.query(UserProfile).filter(UserProfile.id == session.user_id).first() if session.user_id else None
    events = db.query(Event).filter(Event.session_id == session_id).order_by(Event.timestamp.asc()).all()
    previous_recs = db.query(Recommendation).filter(Recommendation.session_id == session_id).all()
    
    from backend.services.recommendation_engine import RecommendationEngine
    recs = RecommendationEngine.generate_recommendations(
        session=session,
        user=user,
        events=events,
        current_intent=intel["intent"],
        friction_level=intel["friction_level"],
        abandonment_probability=intel["abandonment_probability"],
        previous_recommendations=previous_recs
    )
    
    return RecommendationListResponse(
        session_id=session_id,
        intent=intel["intent"],
        friction_level=intel["friction_level"],
        recommendations=[RecommendationItem(**r) for r in recs]
    )

@app.post("/api/recommendations/{session_id}/feedback", tags=["Recommendations"])
def submit_recommendation_feedback(
    session_id: str, 
    payload: RecommendationFeedbackRequest, 
    db: Session = Depends(get_db)
):
    """
    Records user feedback (clicked, dismissed, ignored) to adapt recommendation scoring.
    Supports both payload.feedback_type and payload.action.
    """
    fb_type = payload.feedback_type or payload.action or "clicked"
    rec = None
    if payload.recommendation_id:
        try:
            rec_id_int = int(payload.recommendation_id)
            rec = db.query(Recommendation).filter(Recommendation.id == rec_id_int).first()
        except (ValueError, TypeError):
            rec = db.query(Recommendation).filter(
                Recommendation.session_id == session_id,
                Recommendation.content_id == str(payload.recommendation_id)
            ).order_by(Recommendation.id.desc()).first()
            
    if not rec and payload.content_id:
        rec = db.query(Recommendation).filter(
            Recommendation.session_id == session_id,
            Recommendation.content_id == payload.content_id
        ).order_by(Recommendation.id.desc()).first()
        
    content_id = payload.content_id or (rec.content_id if rec else "content_unknown")
    if not rec:
        rec = Recommendation(
            session_id=session_id,
            content_id=content_id,
            content_type="Content",
            reason="User interaction logged",
            shown_at=datetime.datetime.utcnow()
        )
        db.add(rec)
        
    if fb_type == "clicked":
        rec.clicked = True
    elif fb_type == "dismissed":
        rec.dismissed = True
        
    db.commit()
    return {"status": "success", "content_id": content_id, "feedback": fb_type}

# ==================================================
# Outcomes
# ==================================================
@app.post("/api/outcomes", response_model=OutcomeResponse, status_code=status.HTTP_201_CREATED, tags=["Outcomes"])
def record_outcome(payload: OutcomeCreate, db: Session = Depends(get_db)):
    """Record session outcome and decision point."""
    outcome = Outcome(
        session_id=payload.session_id,
        recommendation_id=payload.recommendation_id,
        decision=payload.decision,
        content_viewed=payload.content_viewed,
        session_continued=payload.session_continued,
        created_at=datetime.datetime.utcnow()
    )
    db.add(outcome)
    db.commit()
    db.refresh(outcome)
    return outcome

# ==================================================
# Dashboard Analytics
# ==================================================
@app.get("/api/dashboard/metrics", response_model=DashboardMetricsResponse, tags=["Dashboard"])
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Aggregate KPIs across sessions, users, quality, and engagement."""
    return DashboardAnalyticsService.get_metrics(db)

@app.get("/api/dashboard/segments", response_model=DashboardSegmentsResponse, tags=["Dashboard"])
def get_dashboard_segments(db: Session = Depends(get_db)):
    """User segment distribution across the platform."""
    return {"segments": DashboardAnalyticsService.get_segments(db)}

@app.get("/api/dashboard/recommendations", response_model=DashboardRecommendationsResponse, tags=["Dashboard"])
def get_dashboard_recommendations(db: Session = Depends(get_db)):
    """Performance metrics (impressions, clicks, CTR) per informational content type."""
    return {"performance": DashboardAnalyticsService.get_recommendations_performance(db)}

@app.get("/api/dashboard/quality", response_model=DashboardQualityResponse, tags=["Dashboard"])
def get_dashboard_quality(db: Session = Depends(get_db)):
    """Session quality and abandonment metrics by user segment."""
    data = DashboardAnalyticsService.get_quality_and_abandonment_by_segment(db)
    return DashboardQualityResponse(**data)

@app.get("/api/dashboard/impact", response_model=DashboardImpactResponse, tags=["Dashboard"])
def get_dashboard_impact(db: Session = Depends(get_db)):
    """Prototype Impact Simulation metrics."""
    data = DashboardAnalyticsService.get_impact_simulation(db)
    return DashboardImpactResponse(**data)

# ==================================================
# Demo Mode Endpoint
# ==================================================
@app.post("/api/demo/start", tags=["Demo Mode"])
def start_demo_session(payload: Optional[DemoStartRequest] = None, db: Session = Depends(get_db)):
    """
    Executes a complete, deterministic demonstration session illustrating high friction,
    abandonment surge, reactive contextual guidance, and outcome resolution.
    """
    uid = payload.user_id if payload else "demo_fan_01"
    mid = payload.match_id if payload else "match_el_clasico"
    return DemoSimulationService.run_demo_simulation(db, user_id=uid, match_id=mid)
