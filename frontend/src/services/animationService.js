import { reactive } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export const animationState = reactive({
    flyingCards: [], // Tableau des cartes en cours d'animation
});

class AnimationService {
    /**
     * Déclenche l'animation d'une carte volant d'un point A à un point B.
     * @param {DOMRect} fromRect - Position de départ (ex: paquet de cartes).
     * @param {DOMRect} toRect - Position d'arrivée (ex: main d'un joueur).
     * @param {Function} onComplete - Callback exécuté à la fin de l'animation.
     * @param {boolean} isHidden - La carte est-elle face cachée ?
     */
    flyCard(fromRect, toRect, onComplete, isHidden = true) {
        const id = uuidv4();

        const cardAnimation = {
            id,
            isHidden,
            style: {
                // Position de départ
                left: `${fromRect.left + fromRect.width / 2}px`,
                top: `${fromRect.top + fromRect.height / 2}px`,
                transform: 'scale(1)',
                opacity: 1,
            },
        };

        animationState.flyingCards.push(cardAnimation);

        // On attend un tick pour que l'élément soit dans le DOM
        requestAnimationFrame(() => {
            const anim = animationState.flyingCards.find(c => c.id === id);
            if (anim) {
                // Animer vers la position de fin
                anim.style.left = `${toRect.left + toRect.width / 2}px`;
                anim.style.top = `${toRect.top + toRect.height / 2}px`;
                //anim.style.transform = 'scale(0.8)'; // La carte semble s'éloigner
                anim.style.opacity = 1;
            }
        });

        // Après l'animation, on retire la carte et on exécute le callback
        setTimeout(() => {
            const index = animationState.flyingCards.findIndex(c => c.id === id);
            if (index !== -1) {
                animationState.flyingCards.splice(index, 1);
            }
            if (onComplete) onComplete();
        }, 400); // Durée de l'animation (doit correspondre au CSS)
    }
}

export const animationService = new AnimationService();
