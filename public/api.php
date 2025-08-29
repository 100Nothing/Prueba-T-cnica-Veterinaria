<?php
// api.php (many-to-many version)
// Full replacement implementing many-to-many owner<->pet relationships.
// Adds editar_* and eliminar_* endpoints, returns dueno_ids / mascota_ids arrays.

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Mascotas\Services\ClinicService;
use Mascotas\Models\Dueno;
use Mascotas\Models\Mascota;
use Mascotas\Models\VisitaMedica;
use Mascotas\Database;

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$clinic = new ClinicService();
$db = Database::getConnection();

function sendJson($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getInput(): array
{
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains((string)$ct, 'application/json')) {
        $body = file_get_contents('php://input');
        $data = json_decode($body, true);
        return is_array($data) ? $data : [];
    }
    return $_POST + $_GET;
}

function parseIds($raw): array
{
    if ($raw === null) return [];
    if (is_array($raw)) return array_values(array_filter(array_map('intval', $raw), fn($v) => $v > 0));
    if (is_string($raw)) {
        $parts = preg_split('/[,;\\s]+/', trim($raw));
        return array_values(array_filter(array_map('intval', $parts), fn($v) => $v > 0));
    }
    return [];
}

try {
    if (!$action) sendJson(['ok' => false, 'error' => 'se requiere el parámetro action'], 400);

    switch ($action) {

        /* ---------------------------
         * Dueños
         * --------------------------- */

        case 'crear_dueno':
            $input = getInput();
            $nombre = trim($input['nombre'] ?? '');
            $apellido = trim($input['apellido'] ?? '');
            $edad = isset($input['edad']) ? (int)$input['edad'] : null;
            $telefono = $input['telefono'] ?? null;
            $errors = [];
            if ($nombre === '') $errors[] = 'nombre es requerido';
            if ($apellido === '') $errors[] = 'apellido es requerido';
            if ($edad === null || $edad < 0) $errors[] = 'edad inválida';
            if (!empty($errors)) sendJson(['ok' => false, 'errors' => $errors], 422);

            $dueno = new Dueno(null, $nombre, $apellido, $edad, $telefono);
            $id = $clinic->crearDueno($dueno);
            sendJson(['ok' => true, 'dueno_id' => $id], 201);
            break;

        case 'editar_dueno':
            // Accepts: id + optional nombre, apellido, edad, telefono, mascota_ids (array or csv)
            $input = getInput();
            $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);
            if (!$id) sendJson(['ok' => false, 'error' => 'se requiere id'], 400);

            $existing = $clinic->obtenerDueno($id);
            if ($existing === null) sendJson(['ok' => false, 'error' => 'dueño no encontrado'], 404);

            $curr = method_exists($existing, 'toArray') ? $existing->toArray() : [];

            $nombre = array_key_exists('nombre', $input) ? trim($input['nombre']) : ($curr['nombre'] ?? '');
            $apellido = array_key_exists('apellido', $input) ? trim($input['apellido']) : ($curr['apellido'] ?? '');
            $edad = array_key_exists('edad', $input) ? (int)$input['edad'] : (isset($curr['edad']) ? (int)$curr['edad'] : null);
            $telefono = array_key_exists('telefono', $input) ? ($input['telefono'] ?? null) : ($curr['telefono'] ?? null);
            $mascotaIds = array_key_exists('mascota_ids', $input) ? parseIds($input['mascota_ids']) : null; // null => don't touch

            $errors = [];
            if ($nombre === '') $errors[] = 'nombre es requerido';
            if ($apellido === '') $errors[] = 'apellido es requerido';
            if ($edad === null || $edad < 0) $errors[] = 'edad inválida';
            if (!empty($errors)) sendJson(['ok' => false, 'errors' => $errors], 422);

            $dueno = new Dueno($id, $nombre, $apellido, $edad, $telefono);
            $res = $clinic->actualizarDueno($dueno, $mascotaIds);
            if ($res) {
                sendJson(['ok' => true, 'dueno_id' => $id], 200);
            } else {
                sendJson(['ok' => false, 'error' => 'no se pudo actualizar el dueño'], 400);
            }
            break;

        case 'eliminar_dueno':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($_POST['id']) ? (int)$_POST['id'] : null);
            if (!$id) sendJson(['ok' => false, 'error' => 'se requiere id'], 400);
            $res = $clinic->eliminarDueno($id);
            if ($res) sendJson(['ok' => true, 'dueno_id' => $id], 200);
            sendJson(['ok' => false, 'error' => 'no se pudo eliminar el dueño'], 400);
            break;

        case 'obtener_dueno':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
            if (!$id) sendJson(['ok' => false, 'error' => 'se requiere id'], 400);
            $d = $clinic->obtenerDueno($id);
            if (!$d) {
                sendJson(['ok' => true, 'dueno' => null], 200);
            } else {
                // fetch all mascota_ids for this dueno
                $stmt = $db->prepare("SELECT mascota_id FROM mascota_dueno WHERE dueno_id = :did");
                $stmt->execute([':did' => $id]);
                $rows = $stmt->fetchAll();
                $mascota_ids = array_map(fn($r) => (int)$r['mascota_id'], $rows);

                $arr = $d->toArray();
                $arr['mascota_ids'] = $mascota_ids;
                sendJson(['ok' => true, 'dueno' => $arr], 200);
            }
            break;

        case 'listar_duenos':
            $duenos = $clinic->obtenerTodosDuenos();
            // include mascota_ids for each dueno
            $out = array_map(function ($d) use ($db) {
                $arr = $d->toArray();
                $stmt = $db->prepare("SELECT mascota_id FROM mascota_dueno WHERE dueno_id = :did");
                $stmt->execute([':did' => $arr['id']]);
                $rows = $stmt->fetchAll();
                $arr['mascota_ids'] = array_map(fn($r) => (int)$r['mascota_id'], $rows);
                return $arr;
            }, $duenos);
            sendJson(['ok' => true, 'duenos' => $out], 200);
            break;

        case 'buscar_dueno':
            $q = trim($_GET['q'] ?? $_POST['q'] ?? '');
            if ($q === '') sendJson(['ok' => false, 'error' => 'se requiere q'], 422);
            $matches = $clinic->obtenerDuenoPorNombre($q);
            $out = array_map(function ($d) use ($db) {
                $arr = $d->toArray();
                $stmt = $db->prepare("SELECT mascota_id FROM mascota_dueno WHERE dueno_id = :did");
                $stmt->execute([':did' => $arr['id']]);
                $rows = $stmt->fetchAll();
                $arr['mascota_ids'] = array_map(fn($r) => (int)$r['mascota_id'], $rows);
                return $arr;
            }, $matches);
            sendJson(['ok' => true, 'results' => $out], 200);
            break;

        /* ---------------------------
         * Mascotas
         * --------------------------- */

        case 'crear_mascota':
            $input = getInput();
            $nombre = trim($input['nombre'] ?? '');
            $edad = isset($input['edad']) ? (int)$input['edad'] : null;
            $especie = trim($input['especie'] ?? '');
            $fecha_nacimiento = trim($input['fecha_nacimiento'] ?? '');
            $condicion = trim($input['condicion'] ?? 'Sano');

            $duenoIds = [];
            if (isset($input['dueno_ids'])) {
                $duenoIds = parseIds($input['dueno_ids']);
            }

            $errors = [];
            if ($nombre === '') $errors[] = 'nombre es requerido';
            if ($edad === null || $edad < 0) $errors[] = 'edad inválida';
            if ($especie === '') $errors[] = 'especie es requerida';
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha_nacimiento)) $errors[] = 'fecha_nacimiento debe ser YYYY-MM-DD';
            if (!empty($errors)) sendJson(['ok' => false, 'errors' => $errors], 422);

            $m = new Mascota(null, $nombre, $edad, $especie, $fecha_nacimiento, $condicion);
            $mascotaId = $clinic->crearMascota($m, $duenoIds);
            sendJson(['ok' => true, 'mascota_id' => $mascotaId], 201);
            break;

        case 'editar_mascota':
            // Editar mascota and optionally set dueno_ids (many-to-many)
            $input = getInput();
            $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);
            if (!$id) sendJson(['ok' => false, 'error' => 'se requiere id'], 400);

            $existing = $clinic->obtenerMascota($id);
            if ($existing === null) sendJson(['ok' => false, 'error' => 'mascota no encontrada'], 404);

            $curr = method_exists($existing, 'toArray') ? $existing->toArray() : [];

            $nombre = array_key_exists('nombre', $input) ? trim($input['nombre']) : ($curr['nombre'] ?? '');
            $edad = array_key_exists('edad', $input) ? (int)$input['edad'] : (isset($curr['edad']) ? (int)$curr['edad'] : null);
            $especie = array_key_exists('especie', $input) ? trim($input['especie']) : ($curr['especie'] ?? '');
            $fecha_nacimiento = array_key_exists('fecha_nacimiento', $input) ? trim($input['fecha_nacimiento']) : ($curr['fecha_nacimiento'] ?? '');
            $condicion = array_key_exists('condicion', $input) ? trim($input['condicion']) : ($curr['condicion'] ?? 'Sano');

            $duenoIds = null;
            if (array_key_exists('dueno_ids', $input)) {
                $duenoIds = parseIds($input['dueno_ids']); // empty array => remove all owners
            }

            $errors = [];
            if ($nombre === '') $errors[] = 'nombre es requerido';
            if ($edad === null || $edad < 0) $errors[] = 'edad inválida';
            if ($especie === '') $errors[] = 'especie es requerida';
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha_nacimiento)) $errors[] = 'fecha_nacimiento debe ser YYYY-MM-DD';
            if (!empty($errors)) sendJson(['ok' => false, 'errors' => $errors], 422);

            $m = new Mascota($id, $nombre, $edad, $especie, $fecha_nacimiento, $condicion);
            $res = $clinic->actualizarMascota($m, $duenoIds);
            if ($res) {
                sendJson(['ok' => true, 'mascota_id' => $id], 200);
            } else {
                sendJson(['ok' => false, 'error' => 'no se pudo actualizar la mascota'], 400);
            }
            break;

        case 'eliminar_mascota':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($_POST['id']) ? (int)$_POST['id'] : null);
            if (!$id) sendJson(['ok' => false, 'error' => 'se requiere id'], 400);
            $res = $clinic->eliminarMascota($id);
            if ($res) sendJson(['ok' => true, 'mascota_id' => $id], 200);
            sendJson(['ok' => false, 'error' => 'no se pudo eliminar la mascota'], 400);
            break;

        case 'obtener_mascota':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
            if (!$id) sendJson(['ok' => false, 'error' => 'se requiere id'], 400);
            $m = $clinic->obtenerMascota($id);
            if (!$m) {
                sendJson(['ok' => true, 'mascota' => null], 200);
            } else {
                // fetch dueno_ids
                $stmt = $db->prepare("SELECT dueno_id FROM mascota_dueno WHERE mascota_id = :mid");
                $stmt->execute([':mid' => $id]);
                $rows = $stmt->fetchAll();
                $dueno_ids = array_map(fn($r) => (int)$r['dueno_id'], $rows);

                $arr = $m->toArray();
                $arr['dueno_ids'] = $dueno_ids;
                sendJson(['ok' => true, 'mascota' => $arr], 200);
            }
            break;

        case 'listar_mascotas':
            // consulta para seleccionar la última visita por mascota correctamente
            $sql = "
                SELECT p.*,
                        GROUP_CONCAT(CONCAT(d.nombre,' ',d.apellido) SEPARATOR ' || ') AS duenos,
                        lv.last_fecha AS ultima_visita_fecha,
                        v.id AS ultima_visita_id,
                        v.diagnostico AS ultima_visita_diagnostico,
                        v.tratamiento AS ultima_visita_tratamiento
                FROM mascotas p
                LEFT JOIN mascota_dueno md ON p.id = md.mascota_id
                LEFT JOIN duenos d ON md.dueno_id = d.id
                LEFT JOIN (
                    SELECT mascota_id, MAX(fecha) AS last_fecha
                    FROM visitas_medicas
                    GROUP BY mascota_id
                ) lv ON lv.mascota_id = p.id
                LEFT JOIN visitas_medicas v ON v.mascota_id = p.id AND v.fecha = lv.last_fecha
                GROUP BY p.id
                ORDER BY p.nombre ASC
            ";
            $stmt = $db->query($sql);
            $rows = $stmt->fetchAll();
            sendJson(['ok' => true, 'mascotas' => $rows], 200);
            break;

        case 'buscar_mascota':
            // búsqueda parcial insensible a mayúsculas por nombre
            $nombre = trim($_GET['nombre'] ?? $_POST['nombre'] ?? '');
            if ($nombre === '') sendJson(['ok' => false, 'errors' => ['nombre es requerido']], 422);
            $results = $clinic->buscarMascotaPorNombre($nombre);
            $out = [];
            foreach ($results as $item) {
                $m = $item['mascota'];
                $stmt = $db->prepare("SELECT dueno_id FROM mascota_dueno WHERE mascota_id = :mid");
                $stmt->execute([':mid' => $m->getId()]);
                $rows = $stmt->fetchAll();
                $dueno_ids = array_map(fn($r) => (int)$r['dueno_id'], $rows);

                $out[] = [
                    'mascota' => array_merge($m->toArray(), ['dueno_ids' => $dueno_ids]),
                    'duenos' => array_map(fn($d) => $d->toArray(), $item['duenos']),
                    'visitas' => array_map(fn($v) => $v->toArray(), $item['visitas'])
                ];
            }
            sendJson(['ok' => true, 'results' => $out], 200);
            break;

        case 'buscar_mascota_exact':
            $nombre = trim($_GET['nombre'] ?? $_POST['nombre'] ?? '');
            if ($nombre === '') sendJson(['ok' => false, 'errors' => ['nombre es requerido']], 422);
            $stmt = $db->prepare("SELECT id FROM mascotas WHERE LOWER(nombre) = LOWER(:nombre)");
            $stmt->execute([':nombre' => $nombre]);
            $ids = array_map(fn($r) => (int)$r['id'], $stmt->fetchAll());
            $out = [];
            foreach ($ids as $id) {
                $out[] = $clinic->getPetWithDuenosYVisitas($id);
            }
            $mapped = array_map(function ($item) use ($db) {
                $m = $item['mascota'];
                $stmt = $db->prepare("SELECT dueno_id FROM mascota_dueno WHERE mascota_id = :mid");
                $stmt->execute([':mid' => $m->getId()]);
                $rows = $stmt->fetchAll();
                $dueno_ids = array_map(fn($r) => (int)$r['dueno_id'], $rows);

                return [
                    'mascota' => array_merge($m->toArray(), ['dueno_ids' => $dueno_ids]),
                    'duenos' => array_map(fn($d) => $d->toArray(), $item['duenos']),
                    'visitas' => array_map(fn($v) => $v->toArray(), $item['visitas'])
                ];
            }, $out);
            sendJson(['ok' => true, 'results' => $mapped], 200);
            break;

        case 'obtener_todas_mascotas':
            $pets = $clinic->obtenerTodasMascotas();
            // include dueno_ids per mascota
            $out = array_map(function ($p) use ($db) {
                $arr = $p->toArray();
                $stmt = $db->prepare("SELECT dueno_id FROM mascota_dueno WHERE mascota_id = :mid");
                $stmt->execute([':mid' => $arr['id']]);
                $rows = $stmt->fetchAll();
                $arr['dueno_ids'] = array_map(fn($r) => (int)$r['dueno_id'], $rows);
                return $arr;
            }, $pets);
            sendJson(['ok' => true, 'mascotas' => $out], 200);
            break;

        case 'mascotas_por_especie':
            $especie = trim($_GET['especie'] ?? $_POST['especie'] ?? '');
            if ($especie === '') sendJson(['ok' => false, 'error' => 'se requiere especie'], 422);
            $pets = $clinic->obtenerMascotasPorEspecie($especie);
            $out = array_map(function ($p) use ($db) {
                $arr = $p->toArray();
                $stmt = $db->prepare("SELECT dueno_id FROM mascota_dueno WHERE mascota_id = :mid");
                $stmt->execute([':mid' => $arr['id']]);
                $rows = $stmt->fetchAll();
                $arr['dueno_ids'] = array_map(fn($r) => (int)$r['dueno_id'], $rows);
                return $arr;
            }, $pets);
            sendJson(['ok' => true, 'mascotas' => $out], 200);
            break;

        case 'mascotas_por_dueno':
            $duenoId = isset($_GET['dueno_id']) ? (int)$_GET['dueno_id'] : null;
            if (!$duenoId) sendJson(['ok' => false, 'error' => 'se requiere dueno_id'], 400);
            $pets = $clinic->obtenerMascotasPorDuenoId($duenoId);
            // include dueno_ids (may include multiple owners)
            $out = [];
            foreach ($pets as $p) {
                $arr = $p->toArray();
                $stmt = $db->prepare("SELECT dueno_id FROM mascota_dueno WHERE mascota_id = :mid");
                $stmt->execute([':mid' => $arr['id']]);
                $rows = $stmt->fetchAll();
                $arr['dueno_ids'] = array_map(fn($r) => (int)$r['dueno_id'], $rows);
                $out[] = $arr;
            }
            sendJson(['ok' => true, 'mascotas' => $out], 200);
            break;

        /* NEW: mascotas_por_dueno_full */
        case 'mascotas_por_dueno_full':
            $duenoId = isset($_GET['dueno_id']) ? (int)$_GET['dueno_id'] : null;
            if (!$duenoId) sendJson(['ok' => false, 'error' => 'se requiere dueno_id'], 400);
            $stmt = $db->prepare("SELECT mascota_id FROM mascota_dueno WHERE dueno_id = :did");
            $stmt->execute([':did' => $duenoId]);
            $rows = $stmt->fetchAll();
            $out = [];
            foreach ($rows as $r) {
                $mid = (int)$r['mascota_id'];
                $item = $clinic->getPetWithDuenosYVisitas($mid);
                if ($item) {
                    $m = $item['mascota'];
                    // include dueno_ids for mascota
                    $stmt2 = $db->prepare("SELECT dueno_id FROM mascota_dueno WHERE mascota_id = :mid");
                    $stmt2->execute([':mid' => $mid]);
                    $drows = $stmt2->fetchAll();
                    $dueno_ids = array_map(fn($rr) => (int)$rr['dueno_id'], $drows);

                    $out[] = [
                        'mascota' => array_merge($m->toArray(), ['dueno_ids' => $dueno_ids]),
                        'duenos' => array_map(fn($d) => $d->toArray(), $item['duenos']),
                        'visitas' => array_map(fn($v) => $v->toArray(), $item['visitas'])
                    ];
                }
            }
            sendJson(['ok' => true, 'results' => $out], 200);
            break;

        /* NEW: dueno_por_mascota_full */
        case 'dueno_por_mascota_full':
            $mid = isset($_GET['mascota_id']) ? (int)$_GET['mascota_id'] : null;
            if (!$mid) sendJson(['ok' => false, 'error' => 'se requiere mascota_id'], 400);
            $duenos = $clinic->obtenerDuenosPorMascota($mid);
            sendJson(['ok' => true, 'duenos' => array_map(fn($d) => $d->toArray(), $duenos)], 200);
            break;

        /* ---------------------------
         * Visitas
         * --------------------------- */

        case 'crear_visita':
            $input = getInput();
            $mascota_id = isset($input['mascota_id']) ? (int)$input['mascota_id'] : null;
            $fecha = trim($input['fecha'] ?? '');
            $diagnostico = trim($input['diagnostico'] ?? '');
            $tratamiento = trim($input['tratamiento'] ?? '');
            $errors = [];
            if ($mascota_id === null || $mascota_id <= 0) $errors[] = 'mascota_id inválido';
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $errors[] = 'fecha debe ser YYYY-MM-DD';
            if ($diagnostico === '') $errors[] = 'diagnostico es requerido';
            if ($tratamiento === '') $errors[] = 'tratamiento es requerido';
            if (!empty($errors)) sendJson(['ok' => false, 'errors' => $errors], 422);
            $v = new VisitaMedica(null, $mascota_id, $fecha, $diagnostico, $tratamiento);
            $visitId = $clinic->crearVisita($v);
            sendJson(['ok' => true, 'visita_id' => $visitId], 201);
            break;

        case 'editar_visita':
            $input = getInput();
            $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);
            if (!$id) sendJson(['ok' => false, 'error' => 'se requiere id'], 400);

            $existing = $clinic->obtenerVisitaPorId($id);
            if ($existing === null) sendJson(['ok' => false, 'error' => 'visita no encontrada'], 404);

            $curr = method_exists($existing, 'toArray') ? $existing->toArray() : [];

            $mascota_id = array_key_exists('mascota_id', $input) ? (int)$input['mascota_id'] : (isset($curr['mascota_id']) ? (int)$curr['mascota_id'] : null);
            $fecha = array_key_exists('fecha', $input) ? trim($input['fecha']) : ($curr['fecha'] ?? '');
            $diagnostico = array_key_exists('diagnostico', $input) ? trim($input['diagnostico']) : ($curr['diagnostico'] ?? '');
            $tratamiento = array_key_exists('tratamiento', $input) ? trim($input['tratamiento']) : ($curr['tratamiento'] ?? '');

            $errors = [];
            if ($mascota_id === null || $mascota_id <= 0) $errors[] = 'mascota_id inválido';
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $errors[] = 'fecha debe ser YYYY-MM-DD';
            if ($diagnostico === '') $errors[] = 'diagnostico es requerido';
            if ($tratamiento === '') $errors[] = 'tratamiento es requerido';
            if (!empty($errors)) sendJson(['ok' => false, 'errors' => $errors], 422);

            $v = new VisitaMedica($id, $mascota_id, $fecha, $diagnostico, $tratamiento);
            $res = $clinic->actualizarVisita($v);
            if ($res) {
                sendJson(['ok' => true, 'visita_id' => $id], 200);
            } else {
                sendJson(['ok' => false, 'error' => 'no se pudo actualizar la visita'], 400);
            }
            break;

        case 'eliminar_visita':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($_POST['id']) ? (int)$_POST['id'] : null);
            if (!$id) sendJson(['ok' => false, 'error' => 'se requiere id'], 400);
            $res = $clinic->eliminarVisita($id);
            if ($res) sendJson(['ok' => true, 'visita_id' => $id], 200);
            sendJson(['ok' => false, 'error' => 'no se pudo eliminar la visita'], 400);
            break;

        case 'obtener_todas_visitas':
            $vis = $clinic->obtenerTodasVisitas();
            sendJson(['ok' => true, 'visitas' => array_map(fn($v) => $v->toArray(), $vis)], 200);
            break;

        case 'visitas_por_mascota':
            $mid = isset($_GET['mascota_id']) ? (int)$_GET['mascota_id'] : null;
            if (!$mid) sendJson(['ok' => false, 'error' => 'se requiere mascota_id'], 400);
            $visitas = $clinic->obtenerVisitasPorMascota($mid);
            sendJson(['ok' => true, 'visitas' => array_map(fn($v) => $v->toArray(), $visitas)], 200);
            break;

        case 'visitas_por_mascota_lite':
            $mid = isset($_GET['mascota_id']) ? (int)$_GET['mascota_id'] : null;
            if (!$mid) sendJson(['ok' => false, 'error' => 'se requiere mascota_id'], 400);
            $list = $clinic->obtenerVisitasPorMascotaLite($mid);
            sendJson(['ok' => true, 'visitas' => $list], 200);
            break;

        case 'obtener_visita':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
            if (!$id) sendJson(['ok' => false, 'error' => 'se requiere id'], 400);
            $v = $clinic->obtenerVisitaPorId($id);
            sendJson(['ok' => true, 'visita' => $v ? $v->toArray() : null], 200);
            break;

        case 'visitas_por_fecha':
            $mid = isset($_GET['mascota_id']) ? (int)$_GET['mascota_id'] : null;
            $fecha = trim($_GET['fecha'] ?? '');
            if (!$mid || $fecha === '') sendJson(['ok' => false, 'error' => 'se requieren mascota_id y fecha'], 400);
            $vis = $clinic->obtenerVisitasPorFecha($mid, $fecha);
            sendJson(['ok' => true, 'visitas' => array_map(fn($v) => $v->toArray(), $vis)], 200);
            break;

        /* ---------------------------
         * Relaciones y ayudantes
         * --------------------------- */

        case 'duenos_por_mascota':
            $mid = isset($_GET['mascota_id']) ? (int)$_GET['mascota_id'] : null;
            if (!$mid) sendJson(['ok' => false, 'error' => 'se requiere mascota_id'], 400);
            $duenos = $clinic->obtenerDuenosPorMascota($mid);
            sendJson(['ok' => true, 'duenos' => array_map(fn($d) => $d->toArray(), $duenos)], 200);
            break;

        case 'relacion_dueno_mascota':
            $mid = isset($_GET['mascota_id']) ? (int)$_GET['mascota_id'] : null;
            $did = isset($_GET['dueno_id']) ? (int)$_GET['dueno_id'] : null;
            if (!$mid || !$did) sendJson(['ok' => false, 'error' => 'se requieren mascota_id y dueno_id'], 400);
            $pair = $clinic->obtenerRelacionDuenoMascota($mid, $did);
            if ($pair === null) sendJson(['ok' => false, 'error' => 'relación no encontrada'], 404);
            sendJson(['ok' => true, 'dueno' => $pair['dueno']->toArray(), 'mascota' => $pair['mascota']->toArray()], 200);
            break;

        /* ---------------------------
         * Exportar CSV
         * --------------------------- */

        case 'export_csv':
            $sql = "SELECT p.id, p.nombre, p.edad, p.especie, p.fecha_nacimiento, p.condicion,
                            GROUP_CONCAT(CONCAT(d.nombre,' ',d.apellido) SEPARATOR '; ') AS duenos
                    FROM mascotas p
                    LEFT JOIN mascota_dueno md ON p.id = md.mascota_id
                    LEFT JOIN duenos d ON md.dueno_id = d.id
                    GROUP BY p.id
                    ORDER BY p.nombre ASC";
            $stmt = $db->query($sql);
            $rows = $stmt->fetchAll();
            $filename = 'mascotas_export_' . date('Ymd_His') . '.csv';
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'nombre', 'edad', 'especie', 'fecha_nacimiento', 'condicion', 'duenos']);
            foreach ($rows as $r) fputcsv($out, [$r['id'], $r['nombre'], $r['edad'], $r['especie'], $r['fecha_nacimiento'], $r['condicion'], $r['duenos'] ?? '']);
            fclose($out);
            exit;
            break;

        case 'autocomplete':
            // GET params: field=owner|mascota|especie & q=letters & limit=10
            $field = strtolower(trim($_GET['field'] ?? ''));
            $q = trim($_GET['q'] ?? '');
            $limit = min(20, max(5, (int)($_GET['limit'] ?? 10)));
            if ($q === '') sendJson(['ok' => false, 'error' => 'q is required'], 422);

            $like = '%' . mb_strtolower($q) . '%';
            if (in_array($field, ['owner', 'dueno', 'dueño'], true)) {
                $stmt = $db->prepare("SELECT id, nombre, apellido
    FROM duenos
    WHERE LOWER(nombre) LIKE :q0 OR LOWER(apellido) LIKE :q1 OR LOWER(CONCAT(nombre,' ',apellido)) LIKE :q2
    ORDER BY nombre, apellido
    LIMIT :limit");
                $stmt->bindValue(':q0', $like);
                $stmt->bindValue(':q1', $like);
                $stmt->bindValue(':q2', $like);
                $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);

                $stmt->execute();
                $rows = $stmt->fetchAll();
                $out = array_map(fn($r) => ['id' => (int)$r['id'], 'label' => $r['nombre'] . ' ' . $r['apellido']], $rows);
                sendJson(['ok' => true, 'data' => $out], 200);
            } elseif (in_array($field, ['mascota', 'pet', 'nombre_mascota'], true)) {
                $stmt = $db->prepare("SELECT id, nombre, especie
    FROM mascotas
    WHERE LOWER(nombre) LIKE :q0 OR LOWER(especie) LIKE :q1
    ORDER BY nombre
    LIMIT :limit");
                $stmt->bindValue(':q0', $like);
                $stmt->bindValue(':q1', $like);
                $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);

                $stmt->execute();
                $rows = $stmt->fetchAll();
                $out = array_map(fn($r) => ['id' => (int)$r['id'], 'label' => $r['nombre'], 'especie' => $r['especie']], $rows);
                sendJson(['ok' => true, 'data' => $out], 200);
            } elseif (in_array($field, ['especie', 'species'], true)) {
                $stmt = $db->prepare("SELECT DISTINCT especie FROM mascotas WHERE LOWER(especie) LIKE :q ORDER BY especie LIMIT :limit");
                $stmt->bindValue(':q', $like);
                $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
                $stmt->execute();
                $rows = $stmt->fetchAll();
                $out = array_map(fn($r) => $r['especie'], $rows);
                sendJson(['ok' => true, 'data' => $out], 200);
            } else {
                sendJson(['ok' => false, 'error' => 'unknown field for autocomplete'], 400);
            }
            break;

        default:
            sendJson(['ok' => false, 'error' => 'acción desconocida: ' . $action], 400);
    }
} catch (\InvalidArgumentException $e) {
    sendJson(['ok' => false, 'error' => $e->getMessage()], 422);
} catch (\RuntimeException $e) {
    sendJson(['ok' => false, 'error' => $e->getMessage()], 400);
} catch (\PDOException $e) {
    sendJson(['ok' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()], 500);
} catch (\Throwable $e) {
    sendJson(['ok' => false, 'error' => 'Error del servidor: ' . $e->getMessage()], 500);
}