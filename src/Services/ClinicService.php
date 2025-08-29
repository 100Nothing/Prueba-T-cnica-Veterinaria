<?php

declare(strict_types=1);

namespace Mascotas\Services;

use Mascotas\Database;
use Mascotas\Models\Dueno;
use Mascotas\Models\Mascota;
use Mascotas\Models\VisitaMedica;
use PDO;
use PDOException;

/**
 * ClinicService - Servicio de clínica veterinaria lado de manejo de datos
 */
class ClinicService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /* ---------------------------
     * Crear / Leer
     * --------------------------- */

    public function crearDueno(Dueno $d): int
    {
        $stmt = $this->db->prepare("INSERT INTO duenos (nombre, apellido, edad, telefono) VALUES (:nombre, :apellido, :edad, :telefono)");
        $stmt->execute([
            ':nombre' => $d->getNombre(),
            ':apellido' => $d->getApellido(),
            ':edad' => $d->getEdad(),
            ':telefono' => $d->getTelefono()
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function obtenerDueno(int $id): ?Dueno
    {
        $stmt = $this->db->prepare("SELECT * FROM duenos WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) return null;
        return new Dueno((int)$row['id'], $row['nombre'], $row['apellido'], (int)$row['edad'], $row['telefono']);
    }

    public function crearMascota(Mascota $m, array $duenoIds = []): int
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("INSERT INTO mascotas (nombre, edad, especie, fecha_nacimiento, condicion) VALUES (:nombre, :edad, :especie, :fecha_nacimiento, :condicion)");
            $stmt->execute([
                ':nombre' => $m->getNombre(),
                ':edad' => $m->getEdad(),
                ':especie' => $m->getEspecie(),
                ':fecha_nacimiento' => $m->getFechaNacimiento(),
                ':condicion' => $m->getCondicion()
            ]);
            $mascotaId = (int)$this->db->lastInsertId();

            if (!empty($duenoIds)) {
                $link = $this->db->prepare("INSERT INTO mascota_dueno (mascota_id, dueno_id) VALUES (:mascota_id, :dueno_id)");
                foreach ($duenoIds as $duenoId) {
                    $link->execute([':mascota_id' => $mascotaId, ':dueno_id' => $duenoId]);
                }
            }

            $this->db->commit();
            return $mascotaId;
        } catch (PDOException $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function obtenerMascota(int $id): ?Mascota
    {
        $stmt = $this->db->prepare("SELECT * FROM mascotas WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $r = $stmt->fetch();
        if (!$r) return null;
        return new Mascota((int)$r['id'], $r['nombre'], (int)$r['edad'], $r['especie'], $r['fecha_nacimiento'], $r['condicion']);
    }

    public function crearVisita(VisitaMedica $v): int
    {
        $p = $this->obtenerMascota($v->getMascotaId());
        if ($p === null) {
            throw new \RuntimeException('Mascota no encontrada para la visita');
        }
        $stmt = $this->db->prepare("INSERT INTO visitas_medicas (mascota_id, fecha, diagnostico, tratamiento) VALUES (:mascota_id, :fecha, :diagnostico, :tratamiento)");
        $stmt->execute([
            ':mascota_id' => $v->getMascotaId(),
            ':fecha' => $v->getFecha(),
            ':diagnostico' => $v->getDiagnostico(),
            ':tratamiento' => $v->getTratamiento()
        ]);
        return (int)$this->db->lastInsertId();
    }

    /* ---------------------------
     * Editar y eliminar
     * --------------------------- */

    /**
     * Actualizar dueño.
     * If $mascotaIds is null => don't touch relations.
     * If it's an array => replace all mascota relations for this dueno with the provided list.
     */
    public function actualizarDueno(Dueno $d, ?array $mascotaIds = null): bool
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("UPDATE duenos SET nombre = :nombre, apellido = :apellido, edad = :edad, telefono = :telefono WHERE id = :id");
            $stmt->execute([
                ':nombre' => $d->getNombre(),
                ':apellido' => $d->getApellido(),
                ':edad' => $d->getEdad(),
                ':telefono' => $d->getTelefono(),
                ':id' => $d->getId()
            ]);

            if ($mascotaIds !== null) {
                // Replace all pivot rows for this dueno
                $del = $this->db->prepare("DELETE FROM mascota_dueno WHERE dueno_id = :did");
                $del->execute([':did' => $d->getId()]);

                if (!empty($mascotaIds)) {
                    $ins = $this->db->prepare("INSERT INTO mascota_dueno (mascota_id, dueno_id) VALUES (:mascota_id, :dueno_id)");
                    foreach ($mascotaIds as $mid) {
                        $ins->execute([':mascota_id' => $mid, ':dueno_id' => $d->getId()]);
                    }
                }
            }

            $this->db->commit();
            return true;
        } catch (PDOException $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Actualizar mascota.
     * If $duenoIds is null => don't touch relations.
     * If it's an array => replace all dueno relations for this mascota with the provided list.
     */
    public function actualizarMascota(Mascota $m, ?array $duenoIds = null): bool
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("UPDATE mascotas SET nombre = :nombre, edad = :edad, especie = :especie, fecha_nacimiento = :fecha_nacimiento, condicion = :condicion WHERE id = :id");
            $stmt->execute([
                ':nombre' => $m->getNombre(),
                ':edad' => $m->getEdad(),
                ':especie' => $m->getEspecie(),
                ':fecha_nacimiento' => $m->getFechaNacimiento(),
                ':condicion' => $m->getCondicion(),
                ':id' => $m->getId()
            ]);

            if ($duenoIds !== null) {
                // Replace all pivot rows for this mascota
                $del = $this->db->prepare("DELETE FROM mascota_dueno WHERE mascota_id = :mid");
                $del->execute([':mid' => $m->getId()]);

                if (!empty($duenoIds)) {
                    $ins = $this->db->prepare("INSERT INTO mascota_dueno (mascota_id, dueno_id) VALUES (:mascota_id, :dueno_id)");
                    foreach ($duenoIds as $did) {
                        $ins->execute([':mascota_id' => $m->getId(), ':dueno_id' => $did]);
                    }
                }
            }

            $this->db->commit();
            return true;
        } catch (PDOException $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Actualizar visita.
     */
    public function actualizarVisita(VisitaMedica $v): bool
    {
        // ensure mascota exists
        $p = $this->obtenerMascota($v->getMascotaId());
        if ($p === null) {
            throw new \RuntimeException('Mascota no encontrada para la visita');
        }
        $stmt = $this->db->prepare("UPDATE visitas_medicas SET mascota_id = :mascota_id, fecha = :fecha, diagnostico = :diagnostico, tratamiento = :tratamiento WHERE id = :id");
        $res = $stmt->execute([
            ':mascota_id' => $v->getMascotaId(),
            ':fecha' => $v->getFecha(),
            ':diagnostico' => $v->getDiagnostico(),
            ':tratamiento' => $v->getTratamiento(),
            ':id' => $v->getId()
        ]);
        return (bool)$res;
    }

    /**
     * Eliminar dueño.
     */
    public function eliminarDueno(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM duenos WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Eliminar mascota.
     */
    public function eliminarMascota(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM mascotas WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Eliminar visita.
     */
    public function eliminarVisita(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM visitas_medicas WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /* ---------------------------
     * Listado y busquedas
     * --------------------------- */

    public function obtenerTodosDuenos(): array
    {
        $stmt = $this->db->query("SELECT * FROM duenos ORDER BY nombre, apellido");
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = new Dueno((int)$r['id'], $r['nombre'], $r['apellido'], (int)$r['edad'], $r['telefono']);
        }
        return $out;
    }

    public function obtenerDuenoPorNombre(string $q): array
    {
        $q = mb_strtolower(trim($q));
        if ($q === '') return [];
        $like = '%' . $q . '%';
        $sql = "
        SELECT *
        FROM duenos
        WHERE LOWER(nombre) LIKE :q1
            OR LOWER(apellido) LIKE :q2
            OR LOWER(CONCAT(nombre, ' ', apellido)) LIKE :q3
        ORDER BY nombre, apellido
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':q1' => $like, ':q2' => $like, ':q3' => $like]);
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = new Dueno((int)$r['id'], $r['nombre'], $r['apellido'], (int)$r['edad'], $r['telefono']);
        }
        return $out;
    }

    public function obtenerTodasMascotas(): array
    {
        $stmt = $this->db->query("SELECT * FROM mascotas ORDER BY nombre");
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = new Mascota((int)$r['id'], $r['nombre'], (int)$r['edad'], $r['especie'], $r['fecha_nacimiento'], $r['condicion']);
        }
        return $out;
    }

    public function obtenerMascotasPorEspecie(string $especie): array
    {
        $q = mb_strtolower(trim($especie));
        if ($q === '') return [];
        $like = '%' . $q . '%';
        $stmt = $this->db->prepare("SELECT * FROM mascotas WHERE LOWER(especie) LIKE :q ORDER BY nombre");
        $stmt->execute([':q' => $like]);
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = new Mascota((int)$r['id'], $r['nombre'], (int)$r['edad'], $r['especie'], $r['fecha_nacimiento'], $r['condicion']);
        }
        return $out;
    }

    public function obtenerMascotasPorDuenoId(int $duenoId): array
    {
        $stmt = $this->db->prepare("SELECT p.* FROM mascotas p JOIN mascota_dueno md ON p.id = md.mascota_id WHERE md.dueno_id = :did ORDER BY p.nombre");
        $stmt->execute([':did' => $duenoId]);
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = new Mascota((int)$r['id'], $r['nombre'], (int)$r['edad'], $r['especie'], $r['fecha_nacimiento'], $r['condicion']);
        }
        return $out;
    }

    /* ---------------------------
     * Visitas
     * --------------------------- */

    public function obtenerTodasVisitas(): array
    {
        $stmt = $this->db->query("SELECT * FROM visitas_medicas ORDER BY fecha DESC");
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = new VisitaMedica((int)$r['id'], (int)$r['mascota_id'], $r['fecha'], $r['diagnostico'], $r['tratamiento']);
        }
        return $out;
    }

    public function obtenerVisitasPorMascota(int $mascotaId): array
    {
        $stmt = $this->db->prepare("SELECT * FROM visitas_medicas WHERE mascota_id = :mid ORDER BY fecha DESC");
        $stmt->execute([':mid' => $mascotaId]);
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = new VisitaMedica((int)$r['id'], (int)$r['mascota_id'], $r['fecha'], $r['diagnostico'], $r['tratamiento']);
        }
        return $out;
    }

    public function obtenerVisitasPorMascotaLite(int $mascotaId): array
    {
        $stmt = $this->db->prepare("SELECT id, fecha FROM visitas_medicas WHERE mascota_id = :mid ORDER BY fecha DESC");
        $stmt->execute([':mid' => $mascotaId]);
        return $stmt->fetchAll();
    }

    public function obtenerVisitaPorId(int $visitId): ?VisitaMedica
    {
        $stmt = $this->db->prepare("SELECT * FROM visitas_medicas WHERE id = :id");
        $stmt->execute([':id' => $visitId]);
        $r = $stmt->fetch();
        if (!$r) return null;
        return new VisitaMedica((int)$r['id'], (int)$r['mascota_id'], $r['fecha'], $r['diagnostico'], $r['tratamiento']);
    }

    public function obtenerVisitasPorFecha(int $mascotaId, string $fecha): array
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            throw new \InvalidArgumentException('fecha debe ser YYYY-MM-DD');
        }
        $stmt = $this->db->prepare("SELECT * FROM visitas_medicas WHERE mascota_id = :mid AND fecha = :fecha ORDER BY fecha DESC");
        $stmt->execute([':mid' => $mascotaId, ':fecha' => $fecha]);
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = new VisitaMedica((int)$r['id'], (int)$r['mascota_id'], $r['fecha'], $r['diagnostico'], $r['tratamiento']);
        }
        return $out;
    }

    /* ---------------------------
     * Relaciones
     * --------------------------- */

    public function obtenerDuenosPorMascota(int $mascotaId): array
    {
        $stmt = $this->db->prepare("SELECT d.* FROM duenos d JOIN mascota_dueno md ON d.id = md.dueno_id WHERE md.mascota_id = :mid ORDER BY d.nombre, d.apellido");
        $stmt->execute([':mid' => $mascotaId]);
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[] = new Dueno((int)$r['id'], $r['nombre'], $r['apellido'], (int)$r['edad'], $r['telefono']);
        }
        return $out;
    }

    public function obtenerRelacionDuenoMascota(int $mascotaId, int $duenoId): ?array
    {
        $stmt = $this->db->prepare("SELECT 1 FROM mascota_dueno WHERE mascota_id = :mid AND dueno_id = :did");
        $stmt->execute([':mid' => $mascotaId, ':did' => $duenoId]);
        $found = (bool)$stmt->fetchColumn();
        if (!$found) return null;

        $dueno = $this->obtenerDueno($duenoId);
        $mascota = $this->obtenerMascota($mascotaId);
        if (!$dueno || !$mascota) return null;

        return ['dueno' => $dueno, 'mascota' => $mascota];
    }

    /* ---------------------------
     * Methodos más complejos
     * --------------------------- */

    public function listarMascotasConUltimaVisita(): array
    {
        $sql = "
            SELECT p.*,
                   GROUP_CONCAT(CONCAT(d.nombre,' ',d.apellido) SEPARATOR ' || ') AS dueños,
                   v.id AS ultima_visita_id, v.fecha AS ultima_visita_fecha, v.diagnostico AS ultima_visita_diagnostico
            FROM mascotas p
            LEFT JOIN mascota_dueno md ON p.id = md.mascota_id
            LEFT JOIN duenos d ON md.dueno_id = d.id
            LEFT JOIN visitas_medicas v ON v.mascota_id = p.id
            GROUP BY p.id
            ORDER BY p.nombre ASC
        ";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    public function buscarMascotaPorNombre(string $nombre): array
    {
        $stmt = $this->db->prepare("SELECT * FROM mascotas WHERE LOWER(nombre) = LOWER(:nombre)");
        $stmt->execute([':nombre' => $nombre]);
        $rows = $stmt->fetchAll();
        $result = [];
        foreach ($rows as $r) {
            $mascotaId = (int)$r['id'];
            $mascota = new Mascota($mascotaId, $r['nombre'], (int)$r['edad'], $r['especie'], $r['fecha_nacimiento'], $r['condicion']);

            $stmt2 = $this->db->prepare("SELECT d.* FROM duenos d JOIN mascota_dueno md ON d.id = md.dueno_id WHERE md.mascota_id = :mid");
            $stmt2->execute([':mid' => $mascotaId]);
            $duenos = [];
            foreach ($stmt2->fetchAll() as $d) {
                $duenos[] = new Dueno((int)$d['id'], $d['nombre'], $d['apellido'], (int)$d['edad'], $d['telefono']);
            }

            $stmt3 = $this->db->prepare("SELECT * FROM visitas_medicas WHERE mascota_id = :mid ORDER BY fecha DESC");
            $stmt3->execute([':mid' => $mascotaId]);
            $visitas = [];
            foreach ($stmt3->fetchAll() as $vv) {
                $visitas[] = new VisitaMedica((int)$vv['id'], (int)$vv['mascota_id'], $vv['fecha'], $vv['diagnostico'], $vv['tratamiento']);
            }

            $result[] = [
                'mascota' => $mascota,
                'duenos' => $duenos,
                'visitas' => $visitas
            ];
        }
        return $result;
    }

    public function getPetWithDuenosYVisitas(int $mascotaId): array
    {
        $mascota = $this->obtenerMascota($mascotaId);
        if ($mascota === null) {
            throw new \RuntimeException('Mascota no encontrada');
        }

        $stmt = $this->db->prepare("SELECT d.* FROM duenos d JOIN mascota_dueno md ON d.id = md.dueno_id WHERE md.mascota_id = :mid");
        $stmt->execute([':mid' => $mascotaId]);
        $duenos = [];
        foreach ($stmt->fetchAll() as $d) {
            $duenos[] = new Dueno((int)$d['id'], $d['nombre'], $d['apellido'], (int)$d['edad'], $d['telefono']);
        }

        $stmt2 = $this->db->prepare("SELECT * FROM visitas_medicas WHERE mascota_id = :mid ORDER BY fecha DESC");
        $stmt2->execute([':mid' => $mascotaId]);
        $visitas = [];
        foreach ($stmt2->fetchAll() as $v) {
            $visitas[] = new VisitaMedica((int)$v['id'], (int)$v['mascota_id'], $v['fecha'], $v['diagnostico'], $v['tratamiento']);
        }

        return [
            'mascota' => $mascota,
            'duenos' => $duenos,
            'visitas' => $visitas
        ];
    }

    public function exportMascotasCsv(string $filePath): void
    {
        $sql = "SELECT p.*, GROUP_CONCAT(CONCAT(d.nombre,' ',d.apellido) SEPARATOR '; ') as dueños
                FROM mascotas p
                LEFT JOIN mascota_dueno md ON p.id = md.mascota_id
                LEFT JOIN duenos d ON md.dueno_id = d.id
                GROUP BY p.id";
        $stmt = $this->db->query($sql);
        $fh = fopen($filePath, 'w');
        fputcsv($fh, ['id', 'nombre', 'edad', 'especie', 'fecha_nacimiento', 'condicion', 'duenos']);
        foreach ($stmt->fetchAll() as $row) {
            fputcsv($fh, [$row['id'], $row['nombre'], $row['edad'], $row['especie'], $row['fecha_nacimiento'], $row['condicion'], $row['dueños'] ?? '']);
        }
        fclose($fh);
    }
}