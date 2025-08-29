# Sistema de Gestión de Mascotas - README

Documento formal y directo para instalar, probar y comprender la arquitectura del proyecto bajo XAMPP. Esta versión incluye instrucciones claras para probar en xampp/htdocs y un atajo de configuración rápida usando `bootstrap.sql`.

---

## Resumen breve

Aplicación PHP + JavaScript (SPA) con un único punto de entrada para la API (`public/api.php`). Persistencia en MySQL. El proyecto usa autoload PSR‑4 y Composer ya está incluido en el paquete.

---

## Requisitos mínimos

* XAMPP (Apache + MySQL/MariaDB) con PHP >= 8.0.
* phpMyAdmin (incluido en XAMPP) o acceso por línea de comandos a `mysql`.
* PDO MySQL activado (XAMPP lo trae por defecto).

---

## Instalación rápida en XAMPP

1. **Copiar el proyecto a htdocs**

   * Extraiga el contenido del proyecto dentro de la carpeta pública de XAMPP:

     * Windows: `C:/xampp/htdocs/mascotas`
     * Linux (XAMPP): `/opt/lampp/htdocs/mascotas`
   * Resultado esperado: el directorio `mascotas` debe contener `src/`, `public/`, `vendor/` y los archivos `.sql`.

2. **Arrancar XAMPP**

   * Abra el Panel de Control de XAMPP y encienda Apache y MySQL (o MariaDB).

3. **Configuración de base de datos — método rápido con `bootstrap.sql`**

   * El archivo `bootstrap.sql` en la raíz crea la base de datos, las tablas y añade datos de ejemplo: es el camino más rápido para dejar el sistema listo.

   **Importar con phpMyAdmin (recomendado para no técnicos):**

   * Abra `http://localhost/phpmyadmin` en su navegador.
   * En la pestaña "Importar", busque y seleccione `bootstrap.sql` desde su equipo.
   * Pulse "Continuar" y espere a que finalice la importación. Al terminar tendrá la base de datos y datos de prueba listos.

   **Importar por línea de comandos (alternativa):**

   * Abra una terminal y ejecute (desde la carpeta donde está `bootstrap.sql`):

     ```bash
     mysql -u root < bootstrap.sql
     ```

     * Si MySQL solicita contraseña: `mysql -u root -p < bootstrap.sql` y escriba la contraseña.

4. **Revisar credenciales de conexión**

   * Abra `src/Config.php` y confirme los valores:

     ```php
     public const DB_DSN  = 'mysql:host=127.0.0.1;dbname=mascotas;charset=utf8mb4';
     public const DB_USER = 'root';
     public const DB_PASS = '';
     ```
   * Modifique `DB_USER` y `DB_PASS` si su instalación de MySQL utiliza otros accesos.

5. **Probar la aplicación desde el navegador**

   * URL de prueba sencilla: `http://localhost/mascotas/public/`.
   * Si la interfaz carga (formularios y listas), la instalación está correcta.
   * Si prefiere un sitio más limpio, configure Apache para que el DocumentRoot apunte a la carpeta `public/` (recomendado en entornos de desarrollo y producción para no exponer `src/`).

---

## Prueba Rápida

1. Compruebe que Apache y MySQL estén corriendo en XAMPP.
2. Confirme que `bootstrap.sql` se importó correctamente.
3. Abra: `http://localhost/mascotas/public/`.
4. Desde la interfaz, cree un dueño o mascota y verifique que aparece en las listas.
5. Probar la API directamente (opcional):

   ```bash
   curl -X POST "http://localhost/mascotas/public/api.php" \
     -H "Content-Type: application/json" \
     -d '{"action":"crear_dueno","nombre":"María","apellido":"Gómez"}'
   ```

   * Respuesta esperada: JSON con el nuevo `id` y estado que indique éxito.

---

## Estructura del proyecto (orientativa)

```
/ (raíz)
├─ bootstrap.sql        # script rápido para crear la BD y poblarla con datos de ejemplo
├─ composer.json
├─ src/                 # código PHP: Config, Database, Models, Services
├─ public/              # carpeta pública (DocumentRoot ideal)
│  ├─ index.html
│  └─ api.php
└─ vendor/              # dependencias / autoload (ya incluido)
```

---

## Puntos importantes (explicados de forma sencilla)

* **`bootstrap.sql`**: atajo útil para demos o pruebas. Ejecutarlo crea todo lo necesario automáticamente.
* **Dónde apuntar el navegador**: para pruebas rápidas use `http://localhost/mascotas/public/`. Para mayor seguridad, haga que Apache sirva directamente la carpeta `public/`.
* **Si aparece un error de conexión a base de datos**: confirme que MySQL está arrancado y que `src/Config.php` contiene las credenciales correctas.
* **Errores HTTP 500**: revisen los logs de Apache desde el panel de XAMPP para identificar la causa.
* **Seguridad mínima**: no dejar `src/` accesible desde la web; no usar usuario root sin contraseña en entornos de red.

---

## Funciones no incluidas en la versión final

A continuación se listan características que ya están implementadas (código y pruebas locales) pero que quedaron fuera del paquete publicado por problemas o interrupciones durante el desarrollo.

* **Importación/Exportación avanzada**: importador CSV/JSON e exportador con mapeo de campos listo; la exportación simple sí funciona, pero la importación masiva fue deshabilitada por riesgo de datos durante las pruebas.
* **Sistema de login**: Debido a la complejidad del sistema que se desarrolló en este proyecto demo, se optó por pulir cada implementación ya hecha en lugar de incluir un sistema login.
* **Diseño responsive para pantallas más pequeñas.**

> Nota técnica mínima: La funcionalidad de exporte CSV se mantiene en el repositorio, puede activarse con cambios puntuales en la configuración y la base de datos.

---

## Autoría y ayuda con IA

El proyecto fue desarrollado mayoritariamente a mano por mi persona, Jorge Exequiel Arce Mora (@100Nothing) (implementación, diseño de base de datos, lógica de negocio y pruebas manuales). Se utilizó asistencia puntual de herramientas de inteligencia artificial para acelerar tareas concretas como generación de snippets, refactorizaciones, redacción de documentación y sugerencias de pruebas. Todas las decisiones críticas, revisiones y pruebas finales fueron ejecutadas manualmente por mi persona.

---

## Nota Personal Final

Como estudiante, en el momento que recibí esta asignación estaba pasando por examenes y múltiples proyectos durante las primeras semanas de desarrollo, lo cuál tomó de mi tiempo y dedicación a este proyecto. Sin embargo, a pesar de ser un desarrollador que quiere dar lo mejor que puede, especialmente en el desarrollo backend, traté de desarrollar este proyecto lo más a mano posible y con la menor cantidad de IA utilizada para desarrollarlo y mostrar lo que puedo desarrollar yo mismo en el backend principalmente.

Sinceramente me disculpo por la falta de características visuales o útiles en general que un sistema de gestión normalmente tendría, más no me aparto al aprendizaje y mejor organización para más proyectos a futuro.

Muchas gracias por la oportunidad.