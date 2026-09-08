from typing import List, Tuple
from backend.models import Event

class IntentDetector:
    """Detects current user session intent based on recent chronological actions."""
    
    INTENTS = ["EXPLORE", "COMPARE", "UNDERSTAND", "REVIEW", "ACT"]
    
    @classmethod
    def detect_intent(cls, events: List[Event]) -> Tuple[str, float, str]:
        """
        Analyzes the last few events in the session to deduce the user's immediate intent.
        Returns: (intent, confidence, reason)
        """
        if not events:
            return "EXPLORE", 0.50, "New session started with exploratory posture."
            
        recent = events[-6:] # Analyze last 6 interactions
        event_types = [e.event_type.lower() if e.event_type else "" for e in recent]
        pages = [e.page.lower() if e.page else "" for e in recent]
        actions = [e.action.lower() if e.action else "" for e in recent]
        
        all_text = " ".join(event_types + pages + actions)
        
        # 1. ACT intent: user saving, clicking insights, interacting with content controls
        if any(term in all_text for term in ["save", "content_click", "share", "select", "pin"]):
            return (
                "ACT",
                0.88,
                "User is actively interacting with informational cards and saving match content."
            )
            
        # 2. COMPARE intent: user viewing H2H, comparisons, switching between teams/matches
        if any(term in all_text for term in ["compare", "comparison", "h2h", "versus", "vs", "head_to_head"]):
            return (
                "COMPARE",
                0.85,
                "User is comparing team attributes, head-to-head records, and relative match forms."
            )
            
        # 3. UNDERSTAND intent: user diving deep into statistics, rules, team forms, metrics
        if any(term in all_text for term in ["stat", "statistics", "rule", "info", "form", "detail"]):
            return (
                "UNDERSTAND",
                0.80,
                "User is inspecting detailed match statistics and rules to understand context."
            )
            
        # 4. REVIEW intent: user going back, returning to previously opened matches or overview
        if any(term in all_text for term in ["back", "overview", "history", "summary"]) or "back" in event_types:
            return (
                "REVIEW",
                0.75,
                "User is navigating back and reviewing previously considered match information."
            )
            
        # 5. EXPLORE: default browsing sports and matches
        match_views = sum(1 for et in event_types if "match" in et or "search" in et or "navigation" in et)
        if match_views >= 2:
            return (
                "EXPLORE",
                0.78,
                "User is actively exploring the fixture catalog across leagues and sports."
            )
            
        return (
            "EXPLORE",
            0.60,
            "General browsing behavior observed across sports event categories."
        )
