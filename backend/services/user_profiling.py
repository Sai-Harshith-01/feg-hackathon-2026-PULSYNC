import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models import UserProfile, Session as DBSession, Event

class UserProfilingService:
    """Profiles users based on observed historical and live behavioral interactions."""
    
    SEGMENTS = [
        "Football Explorer",
        "Multi-Sport Explorer",
        "Statistics Focused",
        "Match Information Seeker",
        "Casual Explorer",
        "Returning User"
    ]
    
    @classmethod
    def get_or_create_user(cls, db: Session, user_id: str, anonymous_id: Optional[str] = None) -> UserProfile:
        user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        if not user:
            user = UserProfile(
                id=user_id,
                anonymous_id=anonymous_id or f"anon_{uuid.uuid4().hex[:10]}",
                segment="Casual Explorer"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    @classmethod
    def update_profile(cls, db: Session, user_id: str) -> UserProfile:
        user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        if not user:
            return cls.get_or_create_user(db, user_id)
            
        # Analyze user events across all sessions
        events = db.query(Event).filter(Event.user_id == user_id).all()
        sessions = db.query(DBSession).filter(DBSession.user_id == user_id).all()
        
        session_count = len(sessions)
        event_count = len(events)
        
        if event_count == 0:
            user.segment = "Casual Explorer" if session_count <= 1 else "Returning User"
            db.commit()
            return user
            
        # Count sports
        sports_counts: Dict[str, int] = {}
        content_counts: Dict[str, int] = {}
        for ev in events:
            if ev.sport:
                sports_counts[ev.sport] = sports_counts.get(ev.sport, 0) + 1
            if ev.event_type:
                content_counts[ev.event_type] = content_counts.get(ev.event_type, 0) + 1
            if ev.page:
                content_counts[ev.page] = content_counts.get(ev.page, 0) + 1
                
        # Determine segment
        stat_events = sum(count for k, count in content_counts.items() if any(term in k.lower() for term in ["stat", "h2h", "form", "compare"]))
        football_ratio = (sports_counts.get("Football", 0) + sports_counts.get("Soccer", 0)) / max(1, sum(sports_counts.values()))
        
        if stat_events > (event_count * 0.4):
            segment = "Statistics Focused"
        elif len(sports_counts) > 2:
            segment = "Multi-Sport Explorer"
        elif football_ratio > 0.6:
            segment = "Football Explorer"
        elif any("match" in k.lower() for k in content_counts):
            segment = "Match Information Seeker"
        elif session_count > 2:
            segment = "Returning User"
        else:
            segment = "Casual Explorer"
            
        user.segment = segment
        db.commit()
        db.refresh(user)
        return user

    @classmethod
    def get_user_summary(cls, db: Session, user_id: str) -> Dict[str, Any]:
        user = cls.get_or_create_user(db, user_id)
        events = db.query(Event).filter(Event.user_id == user_id).all()
        sessions = db.query(DBSession).filter(DBSession.user_id == user_id).all()
        
        sports_counts: Dict[str, int] = {}
        content_counts: Dict[str, int] = {}
        for ev in events:
            if ev.sport:
                sports_counts[ev.sport] = sports_counts.get(ev.sport, 0) + 1
            if ev.action:
                content_counts[ev.action] = content_counts.get(ev.action, 0) + 1
                
        preferred_sport = max(sports_counts, key=sports_counts.get) if sports_counts else "Football"
        top_content = sorted(content_counts.keys(), key=lambda k: content_counts[k], reverse=True)[:5]
        
        return {
            "id": user.id,
            "anonymous_id": user.anonymous_id,
            "segment": user.segment,
            "age_verified": user.age_verified,
            "self_excluded": user.self_excluded,
            "created_at": user.created_at,
            "sessions_count": len(sessions),
            "preferred_sport": preferred_sport,
            "frequently_viewed_content": top_content
        }
