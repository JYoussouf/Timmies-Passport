-- Tombstones. A location is never deleted, because a visitor's stamps live in
-- their own browser keyed on this id: removing a row would quietly empty part
-- of their passport. Closed stores stay, greyed out on the map.
ALTER TABLE locations ADD COLUMN closed INTEGER NOT NULL DEFAULT 0;
