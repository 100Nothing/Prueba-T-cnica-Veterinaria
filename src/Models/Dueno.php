<?php

declare(strict_types=1);

namespace Mascotas\Models;

class Dueno
{
    private ?int $id;
    private string $nombre;
    private string $apellido;
    private int $edad;
    private ?string $telefono;

    public function __construct(?int $id, string $nombre, string $apellido, int $edad, ?string $telefono = null)
    {
        $this->id = $id;
        $this->nombre = trim($nombre);
        $this->apellido = trim($apellido);
        $this->edad = $edad;
        $this->telefono = $telefono ? trim($telefono) : null;
        $this->validate();
    }

    private function validate(): void
    {
        $errors = [];
        if ($this->nombre === '') $errors[] = 'nombre es requerido';
        if ($this->apellido === '') $errors[] = 'apellido es requerido';
        if ($this->edad < 0 || $this->edad > 140) $errors[] = 'edad inválida';
        if (!empty($errors)) {
            throw new \InvalidArgumentException('Dueno validation: ' . implode('; ', $errors));
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

    public function getApellido(): string
    {
        return $this->apellido;
    }
    public function setApellido(string $apellido): void
    {
        $this->apellido = trim($apellido);
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

    public function getTelefono(): ?string
    {
        return $this->telefono;
    }
    public function setTelefono(?string $telefono): void
    {
        $this->telefono = $telefono ? trim($telefono) : null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'apellido' => $this->apellido,
            'edad' => $this->edad,
            'telefono' => $this->telefono,
        ];
    }

    public function __toString(): string
    {
        return $this->nombre . ' ' . $this->apellido;
    }
}
