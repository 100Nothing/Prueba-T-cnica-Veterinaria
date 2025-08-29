<?php

declare(strict_types=1);

namespace Mascotas\Models;

class VisitaMedica
{
    private ?int $id;
    private int $mascota_id;
    private string $fecha; // YYYY-MM-DD
    private string $diagnostico;
    private string $tratamiento;

    public function __construct(?int $id, int $mascota_id, string $fecha, string $diagnostico, string $tratamiento)
    {
        $this->id = $id;
        $this->mascota_id = $mascota_id;
        $this->fecha = $fecha;
        $this->diagnostico = trim($diagnostico);
        $this->tratamiento = trim($tratamiento);
        $this->validate();
    }

    private function validate(): void
    {
        $errors = [];
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $this->fecha)) $errors[] = 'fecha debe ser YYYY-MM-DD';
        if ($this->diagnostico === '') $errors[] = 'diagnostico es requerido';
        if ($this->tratamiento === '') $errors[] = 'tratamiento es requerido';
        if (!empty($errors)) {
            throw new \InvalidArgumentException('VisitaMedica validation: ' . implode('; ', $errors));
        }
    }

    // Getters y Setters
    public function getId(): ?int
    {
        return $this->id;
    }
    public function setId(?int $id): void
    {
        $this->id = $id;
    }

    public function getMascotaId(): int
    {
        return $this->mascota_id;
    }
    public function setMascotaId(int $id): void
    {
        $this->mascota_id = $id;
    }

    public function getFecha(): string
    {
        return $this->fecha;
    }
    public function setFecha(string $fecha): void
    {
        $this->fecha = $fecha;
        $this->validate();
    }

    public function getDiagnostico(): string
    {
        return $this->diagnostico;
    }
    public function setDiagnostico(string $diagnostico): void
    {
        $this->diagnostico = trim($diagnostico);
        $this->validate();
    }

    public function getTratamiento(): string
    {
        return $this->tratamiento;
    }
    public function setTratamiento(string $tratamiento): void
    {
        $this->tratamiento = trim($tratamiento);
        $this->validate();
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'mascota_id' => $this->mascota_id,
            'fecha' => $this->fecha,
            'diagnostico' => $this->diagnostico,
            'tratamiento' => $this->tratamiento,
        ];
    }
}
