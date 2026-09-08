from typing import List, Tuple
from backend.models import Event

class SessionQualityEngine:
    """
    Computes an explainable session quality score (0 - 100).
    Measures meaningful fan comprehension, engagement, and navigational ease.
    """
    
    @classmethod
    def evaluate_quality(
        cls,
        events: List[Event],
        friction_score: float,
        abandonment_prob: float
    ) -> Tuple[float, str]:
        """
        Returns: (quality_score: 0-100, explanation: str)
        """
        if not events:
            return 80.0, "Session started; initial quality baseline established."
            
        base_score = 75.0
        explanations = []
        
        # 1. Meaningful action bonus
        actions_count = sum(1 for e in events if e.action)
        if actions_count >= 3:
            base_score += 15.0
            explanations.append(f"High engagement with content actions ({actions_count} interactions)")
        elif actions_count >= 1:
            base_score += 8.0
            explanations.append("User actively interacted with match details")
            
        # 2. Content diversity bonus
        unique_pages = len(set(e.page for e in events if e.page))
        if unique_pages >= 3:
            base_score += 10.0
            explanations.append("Healthy multi-perspective exploration across screens")
            
        # 3. Penalize navigation friction
        if friction_score >= 70:
            base_score -= 25.0
            explanations.append(f"Significant quality loss from navigation friction ({friction_score} pts)")
        elif friction_score >= 30:
            base_score -= 10.0
            explanations.append("Minor deduction due to navigation hesitation")
            
        # 4. Penalize high abandonment risk
        if abandonment_prob >= 0.70:
            base_score -= 20.0
            explanations.append(f"Elevated abandonment risk ({int(abandonment_prob * 100)}%)")
        elif abandonment_prob >= 0.40:
            base_score -= 8.0
            
        final_quality = round(max(10.0, min(100.0, base_score)), 1)
        explanation_text = "; ".join(explanations) if explanations else "Standard smooth browsing session."
        
        return final_quality, explanation_text
