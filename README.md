
# NailedJob

## Descripción

**NailedJob** es una aplicación web inteligente diseñada para asistir a los usuarios en el proceso de búsqueda de empleo. Su principal objetivo es ayudar a optimizar currículums para ofertas de trabajo específicas, analizar la compatibilidad entre el perfil del candidato y los requisitos de la oferta, y facilitar la búsqueda de nuevas oportunidades laborales, todo ello impulsado por inteligencia artificial.

La aplicación guía al usuario a través de un asistente intuitivo de varios pasos, desde la entrada de datos hasta la obtención de un currículum mejorado y una lista de posibles empleos.

## Características Principales

*   **Recopilación Inteligente de Información:**
    *   Ingreso de detalles de la oferta de empleo mediante texto o URL.
    *   Ingreso del currículum del candidato mediante texto o subida de archivo PDF (con extracción de texto en el navegador).
    *   Opción de subir una foto de perfil para incluir en el PDF del currículum.
    *   Selección del idioma (inglés/español) para los resultados generados por la IA.
*   **Análisis de Compatibilidad con IA:**
    *   Comparación detallada entre la oferta de empleo y el currículum.
    *   Puntuación de compatibilidad porcentual y explicación de fortalezas y debilidades.
    *   Extracción de datos estructurados del currículum (nombre, email, experiencia, educación, habilidades).
    *   (Configurable) Almacenamiento de datos del candidato en MongoDB.
*   **Constructor de Currículums con IA:**
    *   Generación de un currículum nuevo, optimizado y adaptado a la oferta de empleo.
    *   Comparación de la compatibilidad del nuevo currículum vs. el original, mostrando la mejora.
    *   Explicación de las modificaciones realizadas por la IA.
    *   Permite editar el currículum generado directamente en la interfaz.
    *   Descarga del currículum en formato `.txt` y `.pdf` (este último con un diseño profesional de dos columnas y foto de perfil si se proporciona).
*   **Búsqueda Automatizada de Empleo:**
    *   Utiliza el currículum generado por la IA para buscar ofertas de empleo relevantes.
    *   Proporciona hasta 10 enlaces validados a ofertas en portales como InfoJobs, LinkedIn e Indeed (enfocado en España).
*   **Interfaz Multilingüe:**
    *   Disponible en inglés y español, afectando tanto la UI como las interacciones con la IA.

## Flujo de Usuario

1.  **Paso 1: Recopilación de Datos:** El usuario introduce la información de la oferta de empleo y su currículum actual.
2.  **Paso 2: Análisis de Compatibilidad:** La IA evalúa la afinidad entre el currículum y la oferta, mostrando una puntuación y un análisis.
3.  **Paso 3: Creación de Currículum IA:** La IA genera un currículum optimizado. El usuario puede editarlo, ver la mejora en la compatibilidad y descargarlo.
4.  **Paso 4: Búsqueda de Empleo:** La IA utiliza el nuevo currículum para buscar y presentar ofertas de trabajo relevantes.

## Tecnologías Utilizadas

*   **Framework Frontend:** [Next.js](https://nextjs.org/) (con App Router)
*   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
*   **Librería UI:** [React](https://reactjs.org/)
*   **Componentes UI:** [ShadCN UI](https://ui.shadcn.com/)
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
*   **Inteligencia Artificial:** [Genkit (Google AI)](https://firebase.google.com/docs/genkit)
    *   Modelo LLM: `googleai/gemini-2.0-flash`
*   **Procesamiento de PDF (Cliente):** [pdfjs-dist](https://mozilla.github.io/pdf.js/)
*   **Generación de PDF (Cliente):** [jsPDF](https://parall.ax/products/jspdf)
*   **Base de Datos (Opcional, para almacenamiento de candidatos):** [MongoDB](https://www.mongodb.com/)
*   **Gestión de Estado y Contexto:** React Context API
*   **Notificaciones:** Sistema de Toasts personalizado

## Configuración del Entorno Local

Sigue estos pasos para configurar y ejecutar el proyecto localmente:

### Prerrequisitos

*   Node.js (se recomienda v18.x o posterior)
*   npm (v8.x o posterior) o yarn
*   (Opcional) Una cuenta y clúster de MongoDB Atlas configurado si deseas utilizar la funcionalidad de almacenamiento de candidatos.
    *   Asegúrate de configurar la lista de acceso de red en MongoDB Atlas para permitir conexiones desde tu entorno. Para desarrollo local, puedes permitir el acceso desde `0.0.0.0/0` (cualquier IP), pero sé consciente de las implicaciones de seguridad.

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto y configura las siguientes variables. Puedes usar el archivo `.env.example` (si existe) como plantilla.

```env
# Configuración de MongoDB (Opcional)
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority"
MONGODB_DB_NAME="tu_base_de_datos"
MONGODB_COLLECTION_NAME="tu_coleccion_de_candidatos"

# Configuración de Genkit (Google AI)
# Asegúrate de tener configurado tu GOOGLE_API_KEY u otras credenciales
# necesarias para que Google AI funcione con Genkit.
# Consulta la documentación de Genkit para más detalles:
# https://firebase.google.com/docs/genkit/get-started-google-ai
GOOGLE_API_KEY="TU_API_KEY_DE_GOOGLE_AI_AQUÍ"

# Otras variables que puedan ser necesarias para tu configuración específica de Genkit
# GENKIT_ENV="dev" # (Opcional, Genkit puede tener su propia configuración de entorno)
```

**Importante:**
*   Reemplaza los placeholders (ej. `<username>`, `TU_API_KEY_DE_GOOGLE_AI_AQUÍ`) con tus valores reales.
*   Para la `GOOGLE_API_KEY`, necesitas una clave de API válida para los servicios de Google AI (Gemini). Puedes obtenerla desde [Google AI Studio](https://aistudio.google.com/app/apikey).

### Instalación

1.  Clona el repositorio (si aún no lo has hecho):
    ```bash
    git clone <url-del-repositorio>
    cd <nombre-del-directorio>
    ```

2.  Instala las dependencias del proyecto:
    ```bash
    npm install
    # o
    # yarn install
    ```

### Ejecución de la Aplicación

1.  **Iniciar el servidor de desarrollo de Next.js:**
    ```bash
    npm run dev
    ```
    Esto iniciará la aplicación Next.js, generalmente en `http://localhost:3000` (o el puerto especificado por tu entorno, como el 9002).

2.  **(Si es necesario) Iniciar el servidor de desarrollo de Genkit:**
    En una terminal separada, si tus flujos de Genkit necesitan ejecutarse como un servicio independiente o si quieres monitorearlos con la UI de Genkit:
    ```bash
    npm run genkit:dev
    # o para recarga automática al guardar cambios en los flujos:
    # npm run genkit:watch
    ```
    *Nota: En esta aplicación, los flujos de Genkit están diseñados para ser invocados directamente desde el servidor Next.js (`'use server';`), por lo que `genkit:dev` se usa principalmente para el panel de inspección de Genkit y no es estrictamente necesario para que la aplicación funcione si los flujos se ejecutan como parte de las acciones del servidor de Next.js.*

La aplicación debería estar ahora accesible en tu navegador.

## Estructura del Proyecto (Simplificada)

```
.
├── src/
│   ├── app/                # Rutas principales de Next.js (App Router)
│   │   ├── globals.css     # Estilos globales y tema de Tailwind/ShadCN
│   │   ├── layout.tsx      # Layout principal de la aplicación
│   │   └── page.tsx        # Página de inicio
│   ├── ai/                 # Lógica relacionada con Genkit y la IA
│   │   ├── flows/          # Flujos de Genkit (análisis, construcción de CV, búsqueda)
│   │   ├── tools/          # Herramientas de Genkit (extracción de contenido, búsqueda de trabajos)
│   │   ├── dev.ts          # Archivo para el desarrollo de Genkit (importa flujos/herramientas)
│   │   └── genkit.ts       # Configuración global del cliente Genkit
│   ├── components/         # Componentes React reutilizables
│   │   ├── steps/          # Componentes para cada paso del asistente
│   │   ├── ui/             # Componentes de ShadCN UI
│   │   └── app-header.tsx  # Cabecera de la aplicación
│   ├── contexts/           # Contextos de React (ej. LanguageContext)
│   ├── hooks/              # Hooks personalizados (ej. useToast, useMobile)
│   ├── lib/                # Funciones de utilidad, traducciones, etc.
│   │   ├── translations.ts # Textos de internacionalización
│   │   └── mongodb-candidate-storage.ts # Lógica para MongoDB
│   └── ...
├── public/                 # Archivos estáticos
├── .env                    # (Debe ser creado) Variables de entorno
├── next.config.ts          # Configuración de Next.js
├── package.json            # Dependencias y scripts del proyecto
└── README.md               # Este archivo
```

## Contribuciones y Mejoras Futuras

Las contribuciones son bienvenidas. Algunas áreas de mejora potencial incluyen:

*   Guardar y cargar sesiones de trabajo del usuario.
*   Opciones avanzadas de regeneración con IA (diferentes enfoques/prompts).
*   Streaming de respuestas de la IA para una experiencia más fluida.
*   Filtros avanzados para la búsqueda de empleo.
*   Mejoras en el diseño y la usabilidad del PDF generado.

¡Gracias por usar NailedJob!
