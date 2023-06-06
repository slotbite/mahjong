document.addEventListener("DOMContentLoaded", function() {
    const difficultySelector = document.getElementById("difficulty");
    const gameBoard = document.getElementById("game-board");
    const winSound = new Audio("sound/winbanjo.mp3");
    let numPairs = parseInt(difficultySelector.value);
    let gridRows = 2;
    let gridCols = 2;
    let matches = 0;
    let selectedCard = null;

    difficultySelector.addEventListener("change", function() {
        numPairs = parseInt(difficultySelector.value);
        resetGame();
    });

    function createCard(pair) {
        const card = document.createElement("div");
        card.classList.add("card");
        card.classList.add("visible");
        card.dataset.state = "back";
        card.dataset.letter = pair.letter;
        card.textContent = pair.letter;
        card.style.backgroundColor = pair.color;
        return card;
    }

    function generatePairs() {
        const pairs = [];
        for (let i = 0; i < numPairs; i++) {
            const letter = String.fromCharCode(65 + i);
            const hue = Math.floor((i / numPairs) * 360);
            const color = `hsl(${hue}, 80%, 70%)`;
            pairs.push({ letter, color }, { letter, color });
        }
        shuffle(pairs);
        return pairs;
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    let cards = document.querySelectorAll(".card");
    let cardFronts = document.querySelectorAll(".card-front");

    function resetGame() {
        while (gameBoard.firstChild) {
            gameBoard.firstChild.remove();
        }
        gridRows = Math.ceil(numPairs / 2);
        gridCols = Math.ceil(numPairs * 2 / gridRows);
        matches = 0;
        selectedCard = null;

        const pairs = generatePairs();

        cardFronts.forEach(function(cardFront) {
            cardFront.hidden = true;
        });
        for (let i = 0; i < gridRows; i++) {
            for (let j = 0; j < gridCols; j++) {
                const index = i * gridCols + j;
                if (index < numPairs * 2) {
                    const card = createCard(pairs[index]);
                    card.dataset.index = index;
                    card.addEventListener("click", handleCardClick);
                    gameBoard.appendChild(card);
                }
            }
        }
        // cards.forEach(function(card) {
        //     card.dataset.state = "back";
        //     card.classList.remove("hidden");
        // });
    }

    function playClickSound() {
        const audio = new Audio("sound/flip_card.mp3");
        console.log("flip_card");
        audio.play();
    }

    function handleCardClick() {
        if (this.dataset.state === "front" || this.classList.contains("hidden")) {
            return;
        }

        playClickSound();

        this.dataset.state = "front";
        this.classList.add("selected");

        if (selectedCard === null) {
            selectedCard = this;
        } else {
            if (selectedCard.dataset.letter === this.dataset.letter) {
                // Caso de juego 1: Las cartas coinciden
                matches++;
                if (matches === numPairs) {
                    // El jugador ha ganado el juego
                    setTimeout(function() {
                        winSound.play();
                        alert("¡Has ganado!");
                        resetGame();
                    }, 500);
                }
                selectedCard.classList.add("hidden");
                this.classList.add("hidden");
            } else {
                // Caso de juego 2: Las cartas no coinciden
                const card1 = selectedCard;
                const card2 = this;
                setTimeout(function() {
                    card1.dataset.state = "back";
                    card1.classList.remove("selected");
                    card2.dataset.state = "back";
                    card2.classList.remove("selected");
                }, 500);
            }
            selectedCard = null;
        }
    }
    resetGame();
});