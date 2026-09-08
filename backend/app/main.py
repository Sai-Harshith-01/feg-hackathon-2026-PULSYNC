import os
import json
import uuid
import datetime
from typing import List, Optional, Any

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

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

@app.get("/api/users/{id}/profile", tags=["Users"])
def get_user_compact_profile(id: str, db: Session = Depends(get_db)):
    """Fetch compact FEG historical behavioral profile for user."""
    return UserProfilingService.get_historical_player_profile(db, id)

@app.get("/api/users/{id}/recommendation-profile", tags=["Users"])
def get_user_recommendation_profile(id: str, db: Session = Depends(get_db)):
    """Returns compact recommendation profile prior for PULSYNC recommendation engine (< 10 KB)."""
    rec_profiles = load_processed_json("recommendation_profiles.json", {})
    if id in rec_profiles:
        return rec_profiles[id]
    if "demo_profile" in rec_profiles:
        return rec_profiles["demo_profile"]
    return {
        "profile_id": id,
        "sport_affinity": {"Football": 0.75, "Tennis": 0.15},
        "event_affinity": {},
        "content_affinity": {"Team Comparison": 0.90, "Key Statistics": 0.85},
        "activity_level": "HIGH"
    }

# ==================================================
# Sessions Endpoints
# ==================================================
@app.post("/api/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED, tags=["Sessions"])
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    """Initialize a new user session."""
    sid = getattr(payload, "id", None) or getattr(payload, "session_id", None) or f"sess_{uuid.uuid4().hex[:10]}"
    anon_id = getattr(payload, "anonymous_user_id", None) or getattr(payload, "anonymous_id", None) or getattr(payload, "user_id", None)
    uid = getattr(payload, "user_id", None) or anon_id
    
    existing = db.query(DBSession).filter(DBSession.id == sid).first()
    if existing:
        existing.session_id = existing.id
        return existing
        
    user = UserProfilingService.get_or_create_user(db, user_id=uid, anonymous_id=anon_id)
    session_user_id = user.id if user else uid
    session = DBSession(
        id=sid,
        user_id=session_user_id,
        started_at=datetime.datetime.utcnow(),
        is_synthetic=payload.is_synthetic,
        status="ACTIVE"
    )
    try:
        db.add(session)
        db.commit()
        db.refresh(session)
    except IntegrityError:
        db.rollback()
        existing = db.query(DBSession).filter(DBSession.id == sid).first()
        if existing:
            existing.session_id = existing.id
            return existing
        raise

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

def load_processed_json(filename: str, fallback: Optional[Any] = None):
    filepath = os.path.join("data", "processed", filename)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return fallback if fallback is not None else {}


# ==================================================
# Dashboard Analytics
# ==================================================
@app.get("/api/dashboard/dataset-summary", tags=["Dashboard"])
def get_dataset_summary():
    """Returns FEG dataset summary metrics (< 10 KB)."""
    return load_processed_json("dataset_summary.json", {
        "dataset_name": "SB_Player",
        "total_records": 3005499,
        "date_range": {"from": "2026-08-16", "to": "2026-08-31"},
        "unique_players": 15738,
        "unique_sports": 38,
        "unique_events": 5731,
        "data_quality": {"duplicate_rows": 0, "missing_player_id": 0, "data_quality_score": 98.5}
    })

@app.get("/api/dashboard/sports", tags=["Dashboard"])
def get_dashboard_sports():
    """Returns top 10 sports summary (< 10 KB)."""
    return load_processed_json("sports_summary.json", [])

@app.get("/api/dashboard/events", tags=["Dashboard"])
def get_dashboard_events():
    """Returns top 50 events summary (< 100 KB)."""
    return load_processed_json("events_summary.json", [])

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


# ==================================================
# Frontend Compatibility Endpoints (Sports, Events, Auth, Wallet, Promotions)
# ==================================================
@app.get("/api/auth/me", tags=["Auth"])
def get_auth_me():
    return {
        "user": {
            "id": "usr_demo",
            "email": "fan@pulsync.ai",
            "displayName": "Sports Enthusiast",
            "roles": ["customer", "bettor"],
            "status": "active",
            "city": "London"
        },
        "permissions": ["view_events", "place_bets", "view_intelligence"],
        "portal": "customer",
        "wallet": {
            "available": 1000.0,
            "bonus": 50.0,
            "currency": "EUR"
        }
    }


@app.post("/api/auth/login", tags=["Auth"])
def auth_login():
    return {
        "ok": True,
        "token": "demo_jwt_token",
        "user": {
            "id": "usr_demo",
            "email": "fan@pulsync.ai",
            "displayName": "Sports Enthusiast",
            "roles": ["customer"]
        }
    }


@app.post("/api/auth/logout", tags=["Auth"])
def auth_logout():
    return {"ok": True}


def get_sport_slug(name: str) -> str:
    return name.lower().replace(" ", "_")


@app.get("/api/sports", tags=["Sports & Events"])
def list_sports_rail(db: Session = Depends(get_db)):
    """
    Returns list of sports aggregated from real dataset in pulsync.db.
    """
    rows = (
        db.query(Event.sport, func.count(func.distinct(Event.match_id)), func.count(Event.id))
        .filter(Event.sport.isnot(None), Event.sport != "")
        .group_by(Event.sport)
        .order_by(func.count(Event.id).desc())
        .all()
    )
    
    sports = []
    for sport_name, match_cnt, evt_cnt in rows:
        if sport_name in ["World Lotteries", "TOP OFFER"]:
            continue
        slug = get_sport_slug(sport_name)
        sports.append({
            "id": slug,
            "slug": slug,
            "name": sport_name,
            "eventCount": match_cnt if match_cnt > 0 else evt_cnt,
            "liveCount": 1 if sport_name in ["Football", "Tennis", "Basketball"] else 0
        })

    if not sports:
        sports = [
            {"id": "football", "slug": "football", "name": "Football", "eventCount": 5731, "liveCount": 3},
            {"id": "tennis", "slug": "tennis", "name": "Tennis", "eventCount": 1992, "liveCount": 1},
            {"id": "basketball", "slug": "basketball", "name": "Basketball", "eventCount": 362, "liveCount": 0},
            {"id": "baseball", "slug": "baseball", "name": "Baseball", "eventCount": 189, "liveCount": 0},
            {"id": "ice_hockey", "slug": "ice_hockey", "name": "Ice Hockey", "eventCount": 370, "liveCount": 0}
        ]
        
    return {"sports": sports}


@app.get("/api/promotions", tags=["Promotions"])
def get_promotions():
    banners = [
        {"id": "p1", "title": "PULSYNC Live Intelligence", "subtitle": "AI-powered real-time sports analytics", "theme": "sports"},
        {"id": "p2", "title": "Contextual Guidance Active", "subtitle": "Right Information at the Right Time", "theme": "live"},
        {"id": "p3", "title": "Session Quality Tracking", "subtitle": "Friction-free exploration experience", "theme": "casino"}
    ]
    promotions = [
        {"id": "p1", "title": "PULSYNC Live Intelligence", "subtitle": "AI-powered real-time sports analytics", "theme": "sports", "status": "PUBLISHED", "description": "Explore real-time telemetry and contextual guidance."},
        {"id": "p2", "title": "Contextual Guidance Active", "subtitle": "Right Information at the Right Time", "theme": "live", "status": "PUBLISHED", "description": "Automated insights and head-to-head comparison tools."},
        {"id": "p3", "title": "Session Quality Tracking", "subtitle": "Friction-free exploration experience", "theme": "sports", "status": "PUBLISHED", "description": "Continuous telemetry monitoring with personalized suggestions."}
    ]
    return {"banners": banners, "promotions": promotions}


@app.get("/api/events", tags=["Sports & Events"])
def list_events_feed(
    sport: Optional[str] = "all",
    day: Optional[str] = "all",
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = (
        db.query(
            Event.match_id,
            Event.sport,
            func.count(Event.id).label("event_count")
        )
        .filter(
            Event.match_id.isnot(None), 
            Event.match_id != "",
            Event.sport.notin_(["World Lotteries", "TOP OFFER"])
        )
    )
    
    if sport and sport.lower() != "all":
        query = query.filter(
            func.lower(func.replace(Event.sport, " ", "_")) == sport.lower()
        )
        
    rows = (
        query.group_by(Event.match_id, Event.sport)
        .order_by(func.count(Event.id).desc())
        .limit(60)
        .all()
    )
    
    now = datetime.datetime.utcnow()
    events_data = []
    
    for idx, (match_id, sport_name, cnt) in enumerate(rows):
        if " - " in match_id:
            home, away = match_id.split(" - ", 1)
        else:
            home, away = match_id, "Opponent"
            
        h_val = abs(hash(match_id))
        is_live = (status and status.lower() == "live") or (idx % 7 == 0 and not status)
        event_status = "LIVE" if is_live else "UPCOMING"
        
        odds_home = round(1.4 + (h_val % 25) / 10.0, 2)
        odds_draw = round(3.1 + ((h_val >> 2) % 15) / 10.0, 2)
        odds_away = round(2.1 + ((h_val >> 4) % 30) / 10.0, 2)
        
        slug = get_sport_slug(sport_name or "Football")
        
        selections = [
            {"id": f"sel_{idx}_1", "name": home, "odds": odds_home},
        ]
        if sport_name != "Tennis":
            selections.append({"id": f"sel_{idx}_2", "name": "Draw", "odds": odds_draw})
        selections.append({"id": f"sel_{idx}_3", "name": away, "odds": odds_away})
        
        comp_name = f"{sport_name} League" if sport_name else "Major League"
        if "Real Madrid" in match_id or "Barcelona" in match_id or "Elche" in match_id or "Espanyol" in match_id:
            comp_name = "La Liga"
        elif "Man." in match_id or "Arsenal" in match_id or "Chelsea" in match_id or "Newcastle" in match_id or "Brighton" in match_id or "Liverpool" in match_id:
            comp_name = "Premier League"
        elif "Dinamo Zagreb" in match_id or "Hajduk" in match_id or "Istra" in match_id or "Rijeka" in match_id:
            comp_name = "HNL League"
        elif "Milano" in match_id or "Torino" in match_id or "Napoli" in match_id or "Genoa" in match_id or "Cagliari" in match_id:
            comp_name = "Serie A"
        elif "Paris SG" in match_id or "Rennes" in match_id or "Lens" in match_id or "Lille" in match_id:
            comp_name = "Ligue 1"
        elif sport_name == "Tennis":
            comp_name = "ATP Tour"
        elif sport_name == "Basketball":
            comp_name = "FIBA World Tour"
        elif sport_name == "Baseball":
            comp_name = "MLB"

        start_offset = (idx % 8 + 1) if (day and day.lower() == "today") else ((idx % 8 + 24) if (day and day.lower() == "tomorrow") else (idx % 12 + 1))
        events_data.append({
            "id": f"match_{idx}_{slug}",
            "match_id": match_id,
            "home": home,
            "away": away,
            "startsAt": (now + datetime.timedelta(hours=start_offset)).isoformat() + "Z",
            "status": event_status,
            "homeScore": (h_val % 3) if is_live else 0,
            "awayScore": ((h_val >> 3) % 3) if is_live else 0,
            "clockSeconds": (h_val % 4000) if is_live else 0,
            "sport": {"name": sport_name or "Football", "slug": slug},
            "competition": {"name": comp_name},
            "marketCount": 12 + (h_val % 15),
            "primaryMarket": {"id": f"m_{idx}", "name": "Match Winner" if sport_name == "Tennis" else "Match Result", "status": "OPEN"},
            "primarySelections": selections
        })

    if status and status.lower() == "live":
        events_data = [e for e in events_data if e["status"] == "LIVE"]

    return {"events": events_data, "total": len(events_data)}


@app.get("/api/events/{id}", tags=["Sports & Events"])
def get_event_detail(id: str, db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    event_row = db.query(Event).filter(
        (Event.match_id == id) | (Event.match_id.ilike(f"%{id.replace('match_', '')}%"))
    ).first()
    
    match_id = event_row.match_id if (event_row and event_row.match_id) else "Elche - Barcelona"
    sport_name = event_row.sport if (event_row and event_row.sport) else "Football"
    
    if " - " in match_id:
        home, away = match_id.split(" - ", 1)
    else:
        home, away = match_id, "Opponent"
        
    h_val = abs(hash(match_id))
    
    selections = [
        {"id": f"sel_{id}_1", "name": home, "odds": round(1.4 + (h_val % 25) / 10.0, 2), "status": "ACTIVE"},
        {"id": f"sel_{id}_2", "name": "Draw", "odds": round(3.1 + ((h_val >> 2) % 15) / 10.0, 2), "status": "ACTIVE"} if sport_name != "Tennis" else None,
        {"id": f"sel_{id}_3", "name": away, "odds": round(2.1 + ((h_val >> 4) % 30) / 10.0, 2), "status": "ACTIVE"}
    ]
    selections = [s for s in selections if s is not None]
    
    return {
        "event": {
            "id": id,
            "match_id": match_id,
            "home": home,
            "away": away,
            "startsAt": (now + datetime.timedelta(hours=2)).isoformat() + "Z",
            "status": "UPCOMING",
            "homeScore": 0,
            "awayScore": 0,
            "clockSeconds": 0,
            "competition": {"name": f"{sport_name} Championship"},
            "sport": {"name": sport_name, "slug": get_sport_slug(sport_name)},
            "markets": [
                {
                    "id": "m_result",
                    "name": "Match Result (1X2)" if sport_name != "Tennis" else "Match Winner",
                    "status": "OPEN",
                    "selections": selections
                },
                {
                    "id": "m_overunder",
                    "name": "Total Goals (Over/Under 2.5)",
                    "status": "OPEN",
                    "selections": [
                        {"id": "sel_ou_1", "name": "Over 2.5", "odds": 1.70, "status": "ACTIVE"},
                        {"id": "sel_ou_2", "name": "Under 2.5", "odds": 2.15, "status": "ACTIVE"}
                    ]
                }
            ]
        }
    }


@app.get("/api/wallet", tags=["Wallet"])
def get_wallet():
    return {
        "wallet": {
            "available": 1000.0,
            "bonus": 50.0,
            "currency": "EUR"
        },
        "transactions": [
            {"id": "tx_1", "type": "DEPOSIT", "amount": 100.0, "status": "COMPLETED", "created_at": datetime.datetime.utcnow().isoformat() + "Z"}
        ]
    }


@app.get("/api/bets", tags=["Bets"])
def list_bets(filter: Optional[str] = "open"):
    return {"bets": []}


@app.post("/api/bets", tags=["Bets"])
def place_bet():
    return {"ok": True, "betId": f"bet_{uuid.uuid4().hex[:8]}"}


@app.get("/api/casino", tags=["Casino"])
def list_casino_games(category: Optional[str] = "all"):
    return {"games": [], "categories": ["slots", "table", "live"]}


@app.get("/api/notifications", tags=["System"])
def get_notifications():
    return {"notifications": [], "unread": 0}


@app.get("/api/analytics", tags=["Dashboard"])
def get_frontend_analytics(db: Session = Depends(get_db)):
    metrics = DashboardAnalyticsService.get_metrics(db)
    return {"kpis": metrics, **metrics}


@app.get("/api/admin/audit", tags=["Admin"])
def get_admin_audit(q: Optional[str] = ""):
    return {"logs": [], "total": 0}


@app.get("/api/admin/flags", tags=["Admin"])
def get_admin_flags():
    return {"flags": [], "settings": []}


@app.get("/api/ops/events", tags=["Admin"])
def get_ops_events(status: Optional[str] = "all"):
    return {"events": []}


@app.get("/api/risk", tags=["Admin"])
def get_risk_alerts(status: Optional[str] = "all"):
    return {"alerts": []}


@app.get("/api/ledger", tags=["Admin"])
def get_ledger(q: Optional[str] = ""):
    return {"entries": []}


@app.get("/api/support", tags=["Support"])
def get_support_tickets():
    return {"tickets": []}

