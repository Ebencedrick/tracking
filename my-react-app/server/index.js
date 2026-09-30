import app from './app.js'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`[Express Backend] Package Pilot Server running on http://localhost:${PORT}`)
})
