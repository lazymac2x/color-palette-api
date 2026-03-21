const express = require('express');
const cors = require('cors');
const c = require('./colors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'color-palette-api', version: '1.0.0',
    endpoints: [
      'GET  /api/v1/convert/:color',
      'GET  /api/v1/harmony/:type/:color',
      'GET  /api/v1/gradient/:color1/:color2',
      'GET  /api/v1/contrast/:color1/:color2',
      'GET  /api/v1/random',
      'POST /api/v1/css',
      'POST /api/v1/tailwind',
    ],
  });
});

// Convert color between formats
app.get('/api/v1/convert/:color', (req, res) => {
  try {
    const parsed = c.parseColor(req.params.color);
    if (!parsed) return res.status(400).json({ error: 'Invalid color' });
    res.json(parsed);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Color harmonies
app.get('/api/v1/harmony/:type/:color', (req, res) => {
  try {
    const { type, color } = req.params;
    const count = parseInt(req.query.count) || 5;
    const fns = {
      complementary: () => c.complementary(color),
      analogous: () => c.analogous(color),
      triadic: () => c.triadic(color),
      split: () => c.splitComplementary(color),
      tetradic: () => c.tetradic(color),
      monochromatic: () => c.monochromatic(color, count),
    };
    if (!fns[type]) return res.status(400).json({ error: `Unknown type: ${type}. Use: ${Object.keys(fns).join(', ')}` });
    const colors = fns[type]();
    res.json({ type, base: color, colors, count: colors.length, css: c.toCss(colors) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Gradient
app.get('/api/v1/gradient/:color1/:color2', (req, res) => {
  try {
    const steps = Math.min(parseInt(req.query.steps) || 5, 20);
    const colors = c.gradient(req.params.color1, req.params.color2, steps);
    const cssGradient = `linear-gradient(90deg, ${colors.join(', ')})`;
    res.json({ from: req.params.color1, to: req.params.color2, steps, colors, cssGradient });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Contrast / WCAG
app.get('/api/v1/contrast/:color1/:color2', (req, res) => {
  try {
    const wcag = c.wcagCheck(req.params.color1, req.params.color2);
    res.json({ foreground: req.params.color1, background: req.params.color2, ...wcag });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Random palette
app.get('/api/v1/random', (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 5, 10);
  const colors = c.randomPalette(count);
  res.json({ colors, count, css: c.toCss(colors) });
});

// Generate CSS variables
app.post('/api/v1/css', (req, res) => {
  try {
    const { colors, name } = req.body;
    res.type('text/css').send(c.toCss(colors, name));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Generate Tailwind config
app.post('/api/v1/tailwind', (req, res) => {
  try {
    const { colors, name } = req.body;
    res.json(c.toTailwind(colors, name));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`color-palette-api running on http://localhost:${PORT}`));
