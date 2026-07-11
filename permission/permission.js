const params = new URLSearchParams(window.location.search);
document.getElementById('permission-title').textContent = params.get('title') || 'Permission request';
document.getElementById('permission-description').textContent = params.get('description') || '';
document.getElementById('permission-resource').textContent = params.get('resource') || '';

document.getElementById('approve').addEventListener('click', () => window.permission.approve());
document.getElementById('deny').addEventListener('click', () => window.permission.deny());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.permission.deny();
});
