from typing import List, Tuple
from backend.models import Event

class FrictionEngine:
    """
    Detects navigation friction, hesitations, page loops, and disorientations in real-time sessions.
    """
    
    @classmethod
    def calculate_friction(cls, events: List[Event]) -> Tuple[float, str, str]:
        """
        Returns: (friction_score: 0-100, friction_level: LOW/MEDIUM/HIGH, reason: str)
        """
        if len(events) <= 1:
            return 0.0, "LOW", "Session just initiated; no friction detected."
            
        recent = events[-8:] # Inspect last 8 events
        event_types = [e.event_type.lower() if e.event_type else "" for e in recent]
        pages = [e.page.lower() if e.page else "" for e in recent if e.page]
        actions = [e.action.lower() if e.action else "" for e in recent if e.action]
        
        score = 0.0
        reasons = []
        
        # 1. Back button frequency
        back_count = sum(1 for et in event_types if "back" in et) + sum(1 for a in actions if "back" in a)
        if back_count >= 2:
            score += 35.0
            reasons.append(f"Multiple back navigations ({back_count}x)")
        elif back_count == 1:
            score += 15.0
            
        # 2. Repeated page oscillation / Navigation loops (e.g., A -> B -> A)
        if len(pages) >= 3:
            for i in range(len(pages) - 2):
                if pages[i] == pages[i+2] and pages[i] != pages[i+1]:
                    score += 30.0
                    reasons.append(f"Page oscillation loop detected ({pages[i]} ↔ {pages[i+1]})")
                    break
                    
        # 3. Repeated identical page visits without forward action
        if len(pages) >= 2 and pages[-1] == pages[-2]:
            score += 15.0
            reasons.append(f"Repeated identical screen view ({pages[-1]})")
            
        # 4. Search loops / repeated searches
        search_count = sum(1 for et in event_types if "search" in et)
        if search_count >= 3:
            score += 25.0
            reasons.append("Repeated query searches indicating difficulty finding relevant match")
            
        # 5. Excessive quick transitions without content clicks
        clicks = sum(1 for a in actions if any(c in a for c in ["click", "save", "expand", "view"]))
        if len(recent) >= 5 and clicks == 0:
            score += 20.0
            reasons.append("Rapid page transitions without content consumption")
            
        friction_score = round(min(100.0, max(0.0, score)), 1)
        
        if friction_score < 30.0:
            level = "LOW"
        elif friction_score < 70.0:
            level = "MEDIUM"
        else:
            level = "HIGH"
            
        reason_text = "; ".join(reasons) if reasons else "Smooth navigational path with consistent forward intent."
        return friction_score, level, reason_text
