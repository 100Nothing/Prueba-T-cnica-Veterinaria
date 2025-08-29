-- bootstrap.sql
-- Crea base de datos + tablas para Sistema de Gestión de Mascotas + populación inicial de datos
-- Seguro para volver a ejecutar (elimina tablas existentes)

SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `mascotas` CHARACTER SET = 'utf8mb4' COLLATE = 'utf8mb4_unicode_ci';
USE `mascotas`;

-- Eliminar tablas antiguas si existen
DROP TABLE IF EXISTS `visitas_medicas`;
DROP TABLE IF EXISTS `mascota_dueno`;
DROP TABLE IF EXISTS `mascotas`;
DROP TABLE IF EXISTS `duenos`;

-- Tabla: duenos
CREATE TABLE `duenos` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `apellido` VARCHAR(100) NOT NULL,
    `edad` INT NOT NULL,
    `telefono` VARCHAR(50) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_duenos_nombre` (`nombre`, `apellido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: mascotas
CREATE TABLE `mascotas` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `edad` INT NOT NULL,
    `especie` VARCHAR(100) NOT NULL,
    `fecha_nacimiento` DATE NOT NULL,
    `condicion` VARCHAR(255) NOT NULL DEFAULT 'Sano',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_mascotas_nombre` (`nombre`),
    INDEX `idx_mascotas_especie` (`especie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla pivote: mascota_dueno (relación muchos a muchos)
CREATE TABLE `mascota_dueno` (
    `mascota_id` INT UNSIGNED NOT NULL,
    `dueno_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`mascota_id`, `dueno_id`),
    INDEX `idx_mascota_dueno_mascota` (`mascota_id`),
    INDEX `idx_mascota_dueno_dueno` (`dueno_id`),
    CONSTRAINT `fk_md_mascota` FOREIGN KEY (`mascota_id`) REFERENCES `mascotas` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_md_dueno` FOREIGN KEY (`dueno_id`) REFERENCES `duenos` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: visitas_medicas
CREATE TABLE `visitas_medicas` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `mascota_id` INT UNSIGNED NOT NULL,
    `fecha` DATE NOT NULL,
    `diagnostico` TEXT NOT NULL,
    `tratamiento` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_visitas_mascota_fecha` (`mascota_id`, `fecha`),
    CONSTRAINT `fk_visita_mascota` FOREIGN KEY (`mascota_id`) REFERENCES `mascotas` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Popular la base de datos

START TRANSACTION;

-- Dueños
INSERT INTO `duenos` (`nombre`, `apellido`, `edad`, `telefono`) VALUES
('Ana',     'Gómez',     38, '8888-1234'),
('Carlos',  'Méndez',    45, '8888-2345'),
('Lucía',   'Herrera',   29, '8888-3456'),
('Marco',   'Ruiz',      52, '8888-4567');

-- Mascotas
INSERT INTO `mascotas` (`nombre`, `edad`, `especie`, `fecha_nacimiento`, `condicion`) VALUES
('Firulais', 3, 'Perro',  '2022-05-01', 'Sano'),
('Michi',    5, 'Gato',   '2020-09-10', 'Leve alergia'),
('Kiko',     2, 'Ave',    '2023-03-15', 'Sano'),
('Lola',     7, 'Perro',  '2018-11-02', 'Hipotiroidismo'),
('Bugs',     1, 'Conejo', '2024-01-20', 'Sano');

-- Relaciones mascota_dueno (vincular dueños y mascotas)
-- Asumimos que los IDs se generaron en el orden de inserción: duenos 1..4, mascotas 1..5
INSERT INTO `mascota_dueno` (`mascota_id`, `dueno_id`) VALUES
(1, 1), -- Firulais - Ana
(1, 2), -- Firulais - Carlos (co-dueños)
(2, 3), -- Michi - Lucía
(3, 4), -- Kiko - Marco
(4, 1), -- Lola - Ana
(5, 2); -- Bugs - Carlos

-- Visitas médicas
INSERT INTO `visitas_medicas` (`mascota_id`, `fecha`, `diagnostico`, `tratamiento`) VALUES
(1, '2024-01-15', 'Vacunación anual',            'Vacuna combinada aplicada'),
(1, '2024-06-10', 'Revisión por cojera',         'Reposo y antinflamatorio oral'),
(2, '2023-12-01', 'Alergia estacional',          'Antihistamínico y dieta hipoalergénica'),
(3, '2024-04-02', 'Corte de ala y revisado',     'Cura local y reposo 7 días'),
(4, '2022-11-15', 'Control de tiroides',         'Ajuste de medicación'),
(4, '2023-11-20', 'Chequeo general',             'Mantener tratamiento, control 6 meses'),
(5, '2024-02-10', 'Desparasitación',             'Pasta antiparasitaria administrada'),
(2, '2024-05-05', 'Molestia digestiva',         'Cambio de dieta por 2 semanas'),
(3, '2024-07-01', 'Vacunación',                  'Vacuna aplicada'),
(1, '2024-08-01', 'Revisión de salud general',   'Ok — estado óptimo');

COMMIT;
