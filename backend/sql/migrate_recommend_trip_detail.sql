-- ขยายตาราง recommend_trip_detail (จาก tourism_nonthaburi dump เดิมมีแค่ recommend_id, place_id, sequence_order)
-- ใช้เก็บรายละเอียดต่อวัน + คำอธิบายกิจกรรม (textarea ในแอดมิน)
-- หมายเหตุ: server.js จะ ALTER อัตโนมัติถ้ายังไม่มีคอลัมน์ (ensureRecommendTripDetailColumns)

ALTER TABLE `recommend_trip_detail`
  ADD COLUMN `day_index` INT NOT NULL DEFAULT 1 COMMENT 'ลำดับวันในแผน',
  ADD COLUMN `description` TEXT NULL COMMENT 'อธิบายกิจกรรมของวัน (ต่อแถวเดียวกับสถานที่)',
  ADD COLUMN `day_title` VARCHAR(255) NULL COMMENT 'หัวข้อวัน';

-- ---------------------------------------------------------------------------
-- ให้สถานที่เดียวกันซ้ำใน 1 ทริปได้ (day trip สูงสุด 5 แห่ง/วัน ตรวจในแอป)
-- เดิม PK = (recommend_id, place_id) ทำให้ซ้ามไม่ได้
-- เปลี่ยนเป็น PK = (recommend_id, sequence_order)
-- รันใน phpMyAdmin ได้ตามลำดับ (หรือให้ server.js ทำอัตโนมัติ: ensureRecommendTripDetailPrimaryKeyFix)
--
-- ALTER TABLE recommend_trip_detail DROP FOREIGN KEY <ชื่อจาก information_schema>;
-- ALTER TABLE recommend_trip_detail DROP PRIMARY KEY;
-- ALTER TABLE recommend_trip_detail MODIFY sequence_order INT NOT NULL;
-- ALTER TABLE recommend_trip_detail ADD PRIMARY KEY (recommend_id, sequence_order);
-- ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...
-- ---------------------------------------------------------------------------
