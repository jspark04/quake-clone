import './style.css'
import { Game } from './Game.js'

window.addEventListener('DOMContentLoaded', () => {
  // Crosshair
  const crosshair = document.createElement('div');
  crosshair.style.position = 'absolute';
  crosshair.style.top = '50%';
  crosshair.style.left = '50%';
  crosshair.style.width = '10px';
  crosshair.style.height = '10px';
  crosshair.style.backgroundColor = 'white';
  crosshair.style.transform = 'translate(-50%, -50%)';
  crosshair.style.pointerEvents = 'none';
  crosshair.style.borderRadius = '50%';
  document.body.appendChild(crosshair);

  const game = new Game();

  game.start();
});
