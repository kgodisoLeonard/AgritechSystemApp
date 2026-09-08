const healthStatus = document.getElementById('health-status');
const cropList = document.getElementById('crop-list');
const cropForm = document.getElementById('crop-form');
const API_URL = 'http://localhost:5000/api';

const renderCrops = (crops) => {
  cropList.innerHTML = '';

  crops.forEach((crop) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <div>
        <strong>${crop.name}</strong>
        <span>${crop.region}</span>
      </div>
      <span>${crop.status}</span>
    `;
    cropList.appendChild(item);
  });
};

const fetchCrops = async () => {
  try {
    const response = await fetch(`${API_URL}/crops`);
    const list = await response.json();
    renderCrops(list);
  } catch (error) {
    cropList.innerHTML = '<li>Unable to load crop data.</li>';
    console.error(error);
  }
};

const checkHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      throw new Error('Backend unavailable');
    }
    const data = await response.json();
    healthStatus.textContent = `${data.service} is running normally.`;
  } catch (error) {
    healthStatus.textContent = 'Backend is offline or not started yet.';
    healthStatus.style.color = '#b91c1c';
  }
};

cropForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(cropForm);
  const payload = {
    name: formData.get('cropName'),
    status: formData.get('cropStatus'),
    region: formData.get('cropRegion')
  };

  try {
    await fetch(`${API_URL}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    cropForm.reset();
    await fetchCrops();
  } catch (error) {
    console.error(error);
  }
});

checkHealth();
fetchCrops();
