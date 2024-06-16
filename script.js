import { target_Words } from "./targetWords.js";
import { dictionary_Words } from "./dictionary.js";

const targetWords = [...target_Words]; // array of all the words that are going to be used as daily words
const dictionary = [...dictionary_Words]; // array of all the 5 letter words which are accepted by our app

const WORD_LENGTH = 5;
const DANCE_ANIMATION_DURATION = 500;
const FLIP_ANIMATION_DURATION = 500;
const keyboard = document.querySelector("[data-keyboard]");
const alertContainer = document.querySelector("[data-alert-container]");
const guessGrid = document.querySelector("[data-guess-grid]");
const offsetFromDate = new Date(2022, 0, 1); // we want to give a new word daily , so this is the day when the game is gonna start
const msOffset = Date.now() - offsetFromDate; // milliseconds from offsetfromDate to today's date
const dayOffset = msOffset / 1000 / 60 / 60 / 24; // converting millisecs -> days
const targetWord = targetWords[Math.floor(dayOffset)]; // index between 0 to number of days since the day wordle started

startInteraction();
// first starting then stopping the interaction as in the actual game when we guess the word we aren't able to type or do anything
function startInteraction() {
  document.addEventListener("click", handleMouseClick);
  document.addEventListener("keydown", handleKeyPress);
}

function stopInteraction() {
  document.removeEventListener("click", handleMouseClick);
  document.removeEventListener("keydown", handleKeyPress);
}

function handleMouseClick(e) {
  // for the mouse
  if (e.target.matches("[data-key]")) {
    // if any key of the keyboard (present on the screen) is clicked
    pressKey(e.target.dataset.key);
    return;
  }

  if (e.target.matches("[data-enter]")) {
    // checking if enter key is pressed
    submitGuess();
    return;
  }

  if (e.target.matches("[data-delete]")) {
    deleteKey();
    return;
  }
}

function handleKeyPress(e) {
  // for the keyboard (real one)
  if (e.key === "Enter") {
    // if the key pressed is enter key then submit the guess and return as in the mouseclick function
    submitGuess();
    return;
  }

  if (e.key === "Backspace" || e.key === "Delete") {
    deleteKey();
    return;
  }

  if (e.key.match(/^[a-z]$/)) {
    // if their is a SINGLE character between a-z (lowercase)
    pressKey(e.key);
    return;
  }
}

function pressKey(key) {
  // to handle - when we press any key on the keyboard (present on the screen) then it should add that element to the grid
  const activeTiles = getActiveTiles();
  if (activeTiles.length >= WORD_LENGTH) return; // means we have way more letters
  const nextTile = guessGrid.querySelector(":not([data-letter])"); // we will select the first div of the grid whicg doesn't has data-letter and then we will give that to it, so this way if prev grid box is filled we would be able to fill the next div after it
  nextTile.dataset.letter = key.toLowerCase(); // if q has to be added then this will set data-key="q" to the grid's tile
  nextTile.textContent = key; // now q would be visible and it would be capital as in the css we did text-transform: uppercase
  nextTile.dataset.state = "active"; // giving that whitish background as well
}

function deleteKey() {
  const activeTiles = getActiveTiles();
  const lastTile = activeTiles[activeTiles.length - 1];
  if (lastTile == null) return; // if nothing to delete then we can't remove anything
  lastTile.textContent = "";
  delete lastTile.dataset.state; // completely removing the state
  delete lastTile.dataset.letter; // completely removing the letter dataset
}

function submitGuess() {
  const activeTiles = [...getActiveTiles()];
  if (activeTiles.length !== WORD_LENGTH) {
    showAlert("Not enough letters");
    shakeTiles(activeTiles);
    return;
  }

  const guess = activeTiles.reduce((word, tile) => {
    return word + tile.dataset.letter; // taking each letter from the tile and adding to the guess which we would verify if it is correct or mot from the dictionary
  }, ""); // starting with an empty string

  if (!dictionary.includes(guess)) {
    showAlert("Not in word list");
    shakeTiles(activeTiles);
    return;
  }

  //when we entered the right word then all the tiles flip one after the other and also nothing can be clicked => stopInteraction()
  stopInteraction();
  activeTiles.forEach((...params) => flipTile(...params, guess)); // passing all the parameters and the word we typed to guess
}

function flipTile(tile, index, array, guess) {
  // tile, index, array => params
  const letter = tile.dataset.letter; // getting character of each tile
  const key = keyboard.querySelector(`[data-key="${letter}"i]`); // i => for case-insensitive check
  setTimeout(() => {
    // as the flip animation for each letter has a delay, one after the other
    tile.classList.add("flip");
  }, (index * FLIP_ANIMATION_DURATION) / 2); // each one will flip when the prev tile is half way down. animation for element will happen after 250ms then for the next one after 500ms and so on...

  tile.addEventListener(
    "transitionend",
    () => {
      tile.classList.remove("flip");
      if (targetWord[index] === letter) {
        // if the letter at the current index of the target word is same as the letter we typed in
        tile.dataset.state = "correct";
        key.classList.add("correct");
      } else if (targetWord.includes(letter)) {
        // if target is in the word but not in the correct position
        tile.dataset.state = "wrong-location";
        key.classList.add("wrong-location");
      } else {
        tile.dataset.state = "wrong";
        key.classList.add("wrong");
      }

      if (index === array.length - 1) {
        // if we are on the last tile
        tile.addEventListener(
          "transitionend",
          () => {
            // when the animation of the last tile has finished
            startInteraction();
            checkWinLose(guess, array);
          },
          { once: true }
        ); // so that the animations happens only once
      }
    },
    { once: true }
  );
}

function getActiveTiles() {
  // this will give all the active tiles we have, this to handle that when we entered 5 characters => 5 active classes then we don't want it to let the user enter more
  return guessGrid.querySelectorAll('[data-state="active"]'); // returning all the grid tiles with active class
}

function showAlert(message, duration = 1000) {
  // duration => for how long to show the alert, by default 1sec
  const alert = document.createElement("div");
  alert.textContent = message;
  alert.classList.add("alert");
  alertContainer.prepend(alert);
  if (duration == null) return;

  setTimeout(() => {
    alert.classList.add("hide");
    alert.addEventListener("transitionend", () => {
      alert.remove();
    });
  }, duration);
}

function shakeTiles(tiles) {
  tiles.forEach((tile) => {
    tile.classList.add("shake");
    tile.addEventListener(
      "animationend",
      () => {
        tile.classList.remove("shake");
      },
      { once: true }
    );
  });
}

function checkWinLose(guess, tiles) {
  if (guess === targetWord) {
    showAlert("You Win", 5000);
    danceTiles(tiles);
    stopInteraction();
    return;
  }

  const remainingTiles = guessGrid.querySelectorAll(":not([data-letter])"); // all the ones who don't have letter
  if (remainingTiles.length === 0) {
    // no more tiles left to fill in
    showAlert(targetWord.toUpperCase(), null); // passing null as we won't to show this with infinite duration
    stopInteraction();
  }
}

function danceTiles(tiles) {
  tiles.forEach((tile, index) => {
    setTimeout(() => {
      tile.classList.add("dance");
      tile.addEventListener(
        "animationend",
        () => {
          tile.classList.remove("dance");
        },
        { once: true }
      );
    }, (index * DANCE_ANIMATION_DURATION) / 5); // diving by 5 so when one finishes then only the next one starts
  });
}
