const imageNames = [
    'snake_plant.png',
    '40e8bcd1f4b7ae3807d032663e4add1a-pixelicious.png',
    '82ba85e1b41683b4959882410e5ccf11-pixelicious.png',
    'michi.png',
    '212a5d208ff38edae4ec52148f612dbc-pixelicious.png',
    '574ec3c4ea68f82161b66d44b1c505b1-pixelicious.png',
    '0652f495af742bfc227868aef1895b87-pixelicious.png',
    '53917e4a0b9a5e824a62e0d9fffaabd0-pixelicious.png',
    '7083865e376f9f2de39cc379697c25e7-pixelicious.png',
    'ad9b212973142413798eea793bb79cfb-pixelicious.png',
    'ba3ec572793b6aefb7f025000afec006-pixelicious.png',
    'ba3ec572793b6aefb7f025000afesc006-pixelicious.png',
    'bcd038cd7bf05e6b045d573b45344e4a-pixelicious.png',
    'c3d423e2584adc54fa880aa4cf3acc2d-pixelicious.png',
    'cfc0b46bd063dbe4cdfcb97678d72d1d-pixelicious.png',
    'd217204d254399cfda91ace90f5a1ec8-pixelicious.png',
    'dragon_plant.png',
    'e0ec5dfedb542bd0c594ed26d6795c61-pixelicious.png',
    'e25ebbc2ee51c8372118111c078848b4-pixelicious.png',
    'eac1d280713648dad40b89501e248b9d-pixelicious.png',
    'helecho.png',
    'michi2.png',
    'image1.png',
    'image2.png',
    'image3.png',
    'image4.png',
    'image5.png',
    'image6.png',
    'tocomple.png',
    'mostera.png'
];

let pairs = 2;
let matches = 0;
let selectedCards = [];
let gameBoard = document.getElementById('game-board');
let matchesElement = document.getElementById('matches');
let soundEnabled = true;
let modeEnable = true;
let sound_on = 'img/frog_green.png';
let sound_off = 'img/frog_green_back.png';
let mode_on = 'img/cards_black.png';
let mode_off = 'img/cards.png';

const reset_game_btn = document.querySelector(".details button");


function resetGame() {
    // playSound('sound/drama_boom.mp3');
    pairs = parseInt(document.getElementById('difficulty').value);
    matches = 0;
    selectedCards = [];
    matchesElement.textContent = matches;
    gameBoard.innerHTML = '';
    createGameBoard();
}

function createGameBoard() {
    const shuffledImages = shuffleArray(imageNames).slice(0, pairs);
    const cards = shuffledImages.concat(shuffledImages);
    const shuffledCards = shuffleArray(cards);
    console.log(shuffledCards)
    let index = 0;

    for (let i = 0; i < pairs * 2; i++) {
        const card = document.createElement('div');
        card.classList.add('card');


        const frontView = document.createElement('div');
        frontView.classList.add('view', 'front-view');
        const frontImage = document.createElement('img');
        frontImage.src = 'img/question.png';
        frontImage.alt = 'icon';
        frontView.appendChild(frontImage);
        card.appendChild(frontView);

        const backView = document.createElement('div');
        backView.classList.add('view', 'back-view');
        const backImage = document.createElement('img');
        backImage.src = `img/${shuffledCards[i]}`;
        backImage.alt = 'card-img';
        backView.appendChild(backImage);
        card.appendChild(backView);



        // card.style.backgroundImage = `url(img/${shuffledCards[i]})`;
        card.setAttribute('data-index', shuffledCards[i]);
        card.addEventListener('click', () => selectCard(card));
        // card.addEventListener("click", flipCard);
        gameBoard.appendChild(card);
    }
}



function flipCard({ target: clickedCard }) {
    if (cardOne !== clickedCard && !disableDeck) {
        clickedCard.classList.add("flip");
        if (!cardOne) {
            return cardOne = clickedCard;
        }
        cardTwo = clickedCard;
        disableDeck = true;
        let cardOneImg = cardOne.querySelector(".back-view img").src,
            cardTwoImg = cardTwo.querySelector(".back-view img").src;
        matchCards(cardOneImg, cardTwoImg);
    }
}

function selectCard(card) {

    playSound('sound/flip_card.mp3');

    if (card.classList.contains('selected')) {
        return;
    }

    card.classList.add('selected');
    card.classList.add("flip");
    selectedCards.push(card);

    if (selectedCards.length === 2) {
        // setTimeout(checkCards, 10);
        checkCards();
    }
    if (/michi/.test(card.getAttribute('data-index'))) {
        playSound('sound/cat_purr.mp3');
    }
}

function checkCards() {
    const card1 = selectedCards[0];
    const card2 = selectedCards[1];
    console.log("to chek", card1, card2)
    card2.classList.add("flip");
    const index1 = card1.getAttribute('data-index');
    const index2 = card2.getAttribute('data-index');
    console.log(index1, index2);
    if (index1 === index2) {


        setTimeout(function() {
            playSound('sound/match.mp3');
            card1.style.visibility = 'hidden';
            card2.style.visibility = 'hidden';

        }, 300);

        matches++;
        matchesElement.textContent = matches;

        if (matches === pairs) {
            playSound('sound/clean_win.mp3');
            setTimeout(function() {
                
                alert('Superb! You won!');
                resetGame();
            }, 1500);
            // playSound('sound/clean_win.mp3');
            // alert('Superb! You won!');
            // resetGame();
        }
    } else {
        card1.classList.remove('selected');
        card2.classList.remove('selected');


        setTimeout(function() {
            card1.classList.remove("flip");
            card2.classList.remove("flip");

        }, 1500);
        playSound('sound/bad_match.mp3');
    }

    selectedCards = [];
}


function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundButton = document.getElementById('sound-button');
    soundButton.innerHTML = soundEnabled ? `<img src="${sound_on}" alt="Sound On">` : `<img src="${sound_off}" alt="Sound Off">`;

}

function toggleMode() {
    modeEnable = !modeEnable;
    const modeEButton = document.getElementById('modeButton');
    modeEButton.innerHTML = modeEnable ? `<img src="${mode_on}" alt="Sound On">` : `<img src="${mode_off}" alt="Sound Off">`;

}


function playSound(soundPath) {
    if (soundEnabled) {
        const audio = new Audio(soundPath);
        audio.play();
    }
}

function shuffleArray(array) {
    const newArray = array.slice();
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function presset_reset() {
    playSound('sound/drama_boom.mp3');
    resetGame();
}

resetGame();
reset_game_btn.addEventListener("click", presset_reset);
