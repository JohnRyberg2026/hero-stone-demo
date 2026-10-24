/* Approved appearance only. No measurements, storage, audio or automatic motion. */
(function () {
 'use strict';
 const button = document.getElementById('meetHeartStone');
 const previous = button?.querySelector('svg');
 if (!previous) return;
 const image = document.createElement('img');
 image.src = 'images/heartstone/approved-casual.webp';
 image.alt = 'HEART STONE, an auburn-haired cartoon woman wearing her heart-shaped compass, heart-patterned black tank and denim shorts';
 image.width = 1024;
 image.height = 1536;
 image.style.cssText = 'display:block;width:100%;height:auto;max-height:65vh;object-fit:contain;margin:auto;border-radius:12px';
 image.dataset.avatarVersion = 'approved-2026-10-24';
 previous.replaceWith(image);
 const motion = document.getElementById('avatarMotionPreview');
 if (motion) {
  motion.querySelectorAll('button,input').forEach(control => { control.disabled = true; });
  motion.querySelector('[role=status]').textContent = 'Approved appearance preview. Natural character animation is being developed.';
 }
})();
