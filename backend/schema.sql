-- ============================================================
-- Cafe Point - Cafe Management & Online Ordering System
-- MySQL Database Schema
-- Run manually with:  mysql -u root -p < schema.sql
-- (or just run:  npm run seed  from the backend folder, which does this for you)
-- ============================================================

CREATE DATABASE IF NOT EXISTS cafe_point CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cafe_point;

-- USERS (customers + admin share this table, split by role)
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    phone         VARCHAR(20)   NOT NULL,
    address       VARCHAR(255)  DEFAULT NULL,
    role          ENUM('CUSTOMER','ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    category     VARCHAR(60)   NOT NULL,
    name         VARCHAR(120)  NOT NULL,
    description  VARCHAR(255)  DEFAULT '',
    price        DECIMAL(10,2) NOT NULL,
    is_veg       TINYINT(1)    NOT NULL DEFAULT 1,
    image        VARCHAR(500)  DEFAULT '',
    is_available TINYINT(1)    NOT NULL DEFAULT 1,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_menu_item (category, name)
) ENGINE=InnoDB;

-- TABLE BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT DEFAULT NULL,
    name        VARCHAR(120) NOT NULL,
    phone       VARCHAR(20)  NOT NULL,
    guests      INT          NOT NULL,
    date        DATE         NOT NULL,
    time        TIME         NOT NULL,
    notes       VARCHAR(255) DEFAULT '',
    status      ENUM('PENDING','CONFIRMED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    user_id               INT DEFAULT NULL,
    customer_name         VARCHAR(120) NOT NULL,
    phone                 VARCHAR(20)  NOT NULL,
    address               VARCHAR(255) DEFAULT '',
    total                 DECIMAL(10,2) NOT NULL,
    payment_method        ENUM('UPI','CARD','COD') NOT NULL DEFAULT 'COD',
    payment_status        ENUM('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
    transaction_ref       VARCHAR(120) DEFAULT NULL,
    status                ENUM('RECEIVED','PREPARING','READY','COMPLETED','CANCELLED') NOT NULL DEFAULT 'RECEIVED',
    special_instructions  VARCHAR(500) DEFAULT '',
    order_date            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    order_id     INT NOT NULL,
    menu_item_id INT DEFAULT NULL,
    item_name    VARCHAR(120) NOT NULL,
    price        DECIMAL(10,2) NOT NULL,
    quantity     INT NOT NULL,
    item_note    VARCHAR(255) DEFAULT '',
    CONSTRAINT fk_orderitem_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_orderitem_menu  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- FEEDBACK
CREATE TABLE IF NOT EXISTS feedback (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT DEFAULT NULL,
    name       VARCHAR(120) NOT NULL,
    email      VARCHAR(150) DEFAULT '',
    rating     TINYINT NOT NULL DEFAULT 5,
    message    VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- SEED MENU DATA (with real photos so the site looks good out of the box)
INSERT IGNORE INTO menu_items (category, name, description, price, is_veg, image) VALUES
('Coffee','Cappuccino','Rich espresso topped with steamed milk foam',129.00,1,'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80'),
('Coffee','Cafe Latte','Smooth espresso with silky steamed milk',139.00,1,'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&q=80'),
('Coffee','Cold Brew','Slow steeped, smooth and refreshing',149.00,1,'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=80'),
('Coffee','Espresso Shot','Bold double shot of espresso',99.00,1,'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80'),
('Beverages','Masala Chai','Classic Indian spiced tea',79.00,1,'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8ee?w=600&q=80'),
('Beverages','Fresh Lime Soda','Zesty lime with soda, sweet or salted',89.00,1,'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80'),
('Beverages','Hot Chocolate','Rich cocoa topped with marshmallows',149.00,1,'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&q=80'),
('Snacks','Veg Sandwich','Grilled sandwich with fresh veggies & cheese',129.00,1,'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80'),
('Snacks','Chicken Sandwich','Grilled chicken with lettuce & mayo',169.00,0,'https://images.unsplash.com/photo-1550507992-eb63ffee0847?w=600&q=80'),
('Snacks','French Fries','Crispy golden fries with seasoning',99.00,1,'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=600&q=80'),
('Bakery','Chocolate Brownie','Fudgy brownie served warm',119.00,1,'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80'),
('Bakery','Blueberry Muffin','Soft muffin loaded with blueberries',99.00,1,'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&q=80'),
('Bakery','Croissant','Buttery, flaky French pastry',89.00,1,'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80'),
('Desserts','New York Cheesecake','Creamy classic cheesecake slice',179.00,1,'https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=600&q=80'),
('Pizza','Margherita Pizza','Classic cheese & tomato pizza',249.00,1,'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&q=80'),
('Pizza','Farmhouse Pizza','Loaded with fresh veggies',299.00,1,'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80');
