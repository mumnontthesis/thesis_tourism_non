const db = require('../db')

const PLACE_RATING_SUB = `(
  SELECT ROUND(COALESCE(AVG(r.rating), 0), 1)
  FROM review r
  WHERE r.place_id = p.place_id
)`
const PLACE_REVIEWS_SUB = `(
  SELECT COUNT(*)
  FROM review r
  WHERE r.place_id = p.place_id
)`

const PLACES_LIST_LIGHT_SELECT = `
  SELECT
    p.place_id,
    p.place_name,
    p.category,
    p.location,
    p.description,
    p.open_time,
    p.close_time,
    NULL AS image_url,
    ${PLACE_RATING_SUB} AS rating,
    ${PLACE_REVIEWS_SUB} AS reviews
  FROM place p
`

async function bench(label, sql, params = []) {
  const t = Date.now()
  const [rows] = await db.promise().query(sql, params)
  const ms = Date.now() - t
  const jsonLen = JSON.stringify(rows).length
  console.log(`${label}: rows=${rows.length} queryMs=${ms} jsonChars=${jsonLen}`)
}

async function main() {
  await bench(
    'paginated12',
    `${PLACES_LIST_LIGHT_SELECT} ORDER BY p.place_name ASC LIMIT 12 OFFSET 0`
  )
  await bench('count', 'SELECT COUNT(*) AS total FROM place p')
  await bench('full59', `${PLACES_LIST_LIGHT_SELECT} ORDER BY p.place_name ASC`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
