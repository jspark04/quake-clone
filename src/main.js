import './style.css'
import { Game } from './Game.js'

window.addEventListener('DOMContentLoaded', () => {
  // Crosshair (Only create if not exists)
  if (!document.getElementById('img-crosshair')) {
    const crosshair = document.createElement('div');
    crosshair.id = 'img-crosshair';
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
  }

  // Cleanup previous game instance for HMR
  if (window.game) {
    window.game.dispose();
  }

  const game = new Game();
  window.game = game; // Expose for cleanup

  game.start();
});
