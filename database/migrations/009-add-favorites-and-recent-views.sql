-- database/migrations/009-add-favorites-and-recent-views.sql
-- Bảng lưu trữ tài liệu yêu thích của người dùng (ĐÃ SỬA LỖI)
CREATE TABLE user_document_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE, -- SỬA LỖI TẠI ĐÂY
    UNIQUE(user_id, document_id)
);

-- Bảng lưu trữ lịch sử xem tài liệu gần đây
CREATE TABLE user_recent_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    viewed_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Tạo index để tối ưu hiệu năng truy vấn
CREATE INDEX idx_user_favorites_user_id ON user_document_favorites(user_id);
CREATE INDEX idx_user_favorites_document_id ON user_document_favorites(document_id);
CREATE INDEX idx_user_recent_views_user_id ON user_recent_views(user_id);
CREATE INDEX idx_user_recent_views_viewed_at ON user_recent_views(viewed_at DESC);
CREATE INDEX idx_user_recent_views_user_document ON user_recent_views(user_id, document_id);

-- Trigger để tự động cập nhật viewed_at khi có view mới cho cùng user và document
CREATE TRIGGER update_recent_view_timestamp
AFTER INSERT ON user_recent_views
WHEN EXISTS (
    SELECT 1
    FROM user_recent_views
    WHERE user_id = NEW.user_id
      AND document_id = NEW.document_id
      AND id != NEW.id
)
BEGIN
    DELETE FROM user_recent_views
    WHERE user_id = NEW.user_id
      AND document_id = NEW.document_id
      AND id != NEW.id;
END;