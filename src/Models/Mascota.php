<?php

declare(strict_types=1);

namespace Mascotas\Models;

class Mascota
{
    private ?int $id;
    private string $nombre;
    private int $edad;
    private string $especie;
    private string $fecha_nacimiento; // YYYY-MM-DD
    private string $condicion;

    public function __construct(?int $id, string $nombre, int $edad, string $especie, string $fecha_nacimiento, string $condicion = 'Sano')
    {
        $this->id = $id;
        $this->nombre = trim($nombre);
        $this->edad = $edad;
        $this->especie = trim($especie);
        $this->fecha_nacimiento = $fecha_nacimiento;
        $this->condicion = trim($condicion);
        $this->validate();
    }

    private function validate(): void
    {
        $errors = [];
        if ($this->nombre === '') $errors[] = 'nombre es requerido';
        if ($this->edad < 0) $errors[] = 'edad debe ser >= 0';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $this->fecha_nacimiento)) $errors[] = 'fecha_nacimiento debe ser YYYY-MM-DD';
        if ($this->especie === '') $errors[] = 'especie es requerida';
        if (!empty($errors)) {
            throw new \InvalidArgumentException('Mascota validation: ' . implode('; ', $errors));
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

    public function getNombre(): string
    {
        return $this->nombre;
    }
    public function setNombre(string $nombre): void
    {
        $this->nombre = trim($nombre);
        $this->validate();
    }

    public function getEdad(): int
    {
        return $this->edad;
    }
    public function setEdad(int $edad): void
    {
        $this->edad = $edad;
        $this->validate();
    }

    public function getEspecie(): string
    {
        return $this->especie;
    }
    public function setEspecie(string $especie): void
    {
        $this->especie = trim($especie);
        $this->validate();
    }

    public function getFechaNacimiento(): string
    {
        return $this->fecha_nacimiento;
    }
    public function setFechaNacimiento(string $fecha_nacimiento): void
    {
        $this->fecha_nacimiento = $fecha_nacimiento;
        $this->validate();
    }

    public function getCondicion(): string
    {
        return $this->condicion;
    }
    public function setCondicion(string $condicion): void
    {
        $this->condicion = trim($condicion);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'edad' => $this->edad,
            'especie' => $this->especie,
            'fecha_nacimiento' => $this->fecha_nacimiento,
            'condicion' => $this->condicion,
        ];
    }

    public function __toString(): string
    {
        return "{$this->nombre} ({$this->especie})";
    }
}
