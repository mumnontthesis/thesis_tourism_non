const db = require('../db')

async function time(label, sql, params = []) {
  const t0 = Date.now()
  await db.promise().query(sql, params)
  console.log(`${label}: ${Date.now() - t0}ms`)
}

async function main() {
  await time(
    'simple',
    `SELECT p.place_id FROM place p WHERE p.entrepreneur_id IS NULL ORDER BY p.place_id DESC LIMIT 80`
  )
  await time(
    'exists',
    `SELECT p.place_id,
      EXISTS(SELECT 1 FROM image i WHERE i.place_id = p.place_id AND i.image_url IS NOT NULL AND TRIM(i.image_url) != '') AS hc
     FROM place p WHERE p.entrepreneur_id IS NULL LIMIT 80`
  )
  await time(
    'exists_no_url',
    `SELECT p.place_id,
      EXISTS(SELECT 1 FROM image i WHERE i.place_id = p.place_id) AS hc
     FROM place p WHERE p.entrepreneur_id IS NULL LIMIT 80`
  )
  await time(
    'join_distinct',
    `SELECT p.place_id FROM place p
     INNER JOIN (SELECT DISTINCT place_id FROM image WHERE place_id IS NOT NULL) ic ON ic.place_id = p.place_id
     WHERE p.entrepreneur_id IS NULL LIMIT 80`
  )
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
