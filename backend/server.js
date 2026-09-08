import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

const crops = [
  { id: 1, name: 'Maize', status: 'Healthy', region: 'North' },
  { id: 2, name: 'Rice', status: 'Needs review', region: 'West' },
  { id: 3, name: 'Tomato', status: 'Irrigation alert', region: 'South' }
];

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'agritech-backend' });
});

app.get('/api/crops', (req, res) => {
  res.json(crops);
});

app.post('/api/crops', (req, res) => {
  const { name, status, region } = req.body;

  if (!name || !status || !region) {
    return res.status(400).json({ error: 'Name, status, and region are required.' });
  }

  const crop = {
    id: Date.now(),
    name,
    status,
    region
  };

  crops.push(crop);
  res.status(201).json(crop);
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
