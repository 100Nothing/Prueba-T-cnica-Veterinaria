-- populate.sql
-- Ejecutar después de schema.sql (ÚNICAMENTE SI LA DB ESTÁ VACÍA)

USE `sttinternacional_Mascotas`;

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
