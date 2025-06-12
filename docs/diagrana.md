graph LR
    A[Inicio: Usuario accede a la App] --> B{Paso 1: Recopilación de Datos};
    B --> B1[Usuario ingresa Info Oferta de Empleo<br/>(Texto/URL y Título del Puesto)];
    B --> B2[Usuario ingresa Info Currículum<br/>(Texto/Sube PDF)];
    B1 --> B3;
    B2 --> B3;
    B3 --> B4[Usuario sube Foto de Perfil (Opcional)];
    B4 --> B5[Usuario selecciona Idioma para resultados IA];
    B5 --> Clic1{Clic en "Analizar Compatibilidad"};

    Clic1 --> Proc1[Procesamiento IA 1:<br/>- Extraer texto de URL/PDF si es necesario<br/>- Llamar a Genkit: analyzeCompatibility<br/>(Oferta + CV Original + Idioma)<br/>- Guardar datos en MongoDB];
    Proc1 --> D{Paso 2: Análisis de Compatibilidad IA};
    D --> D1[Mostrar Puntuación de Compatibilidad Original];
    D --> D2[Mostrar Explicación de la IA];
    D --> D3[Mostrar Consejo Personalizado];
    D1 --> D4;
    D2 --> D4;
    D3 --> D4;
    D4 --> Clic2{Clic en "Crear Currículum"};

    Clic2 --> Proc2[Procesamiento IA 2:<br/>1. Llamar a Genkit: aiResumeBuilder<br/>(Oferta + CV Original + Foto + Idioma)<br/>-> Genera CV IA y Explicación Cambios<br/>2. Llamar a Genkit: analyzeCompatibility<br/>(Oferta + CV IA + Idioma)<br/>-> Nueva Puntuación de Compatibilidad];
    Proc2 --> E{Paso 3: Currículum Personalizado IA};
    E --> E1[Mostrar Comparación:<br/>- Puntuación Compatibilidad Original<br/>- Puntuación Compatibilidad Nuevo CV IA<br/>- Mejora %];
    E --> E2[Mostrar CV IA en Área de Texto Editable];
    E --> E3[Mostrar Explicación de Cambios de la IA];
    E1 --> E4;
    E2 --> E4;
    E3 --> E4;
    E4 --> Opt1{Usuario edita CV IA?};
    Opt1 -- Sí --> E2;
    Opt1 -- No --> E5;
    E4 --> Opt2{Clic en "Regenerar Currículum"};
    Opt2 -- Sí --> Proc2_Regenerate[Procesamiento IA (similar a Proc2):<br/>- Llamar a aiResumeBuilder (mismos inputs originales)<br/>- Llamar a analyzeCompatibility (con nuevo CV IA regenerado)];
    Proc2_Regenerate --> E;
    Opt2 -- No --> E5;
    E4 --> Opt3{Clic en "Descargar"};
    Opt3 -- TXT --> DescTXT[Descargar CV como .txt];
    Opt3 -- PDF --> DescPDF[Generar y Descargar CV como .pdf<br/>(con foto, formato 2 columnas)];
    DescTXT --> E;
    DescPDF --> E;
    E5 --> Clic3{Clic en "Buscar Empleos"};

    Clic3 --> Proc3[Procesamiento IA 3:<br/>- Llamar a Genkit: automatedJobSearch<br/>(CV IA Editado + Título del Puesto + Idioma)<br/>-> USA findJobsTool<br/>- Validar enlaces de empleo];
    Proc3 --> F{Paso 4: Resultados de Búsqueda de Empleo};
    F --> F1[Mostrar Lista de Enlaces a Ofertas de Empleo];
    F1 --> Clic4{Clic en "Empezar de Nuevo"};
    Clic4 --> B;

    subgraph Leyenda
        direction LR
        UsuarioAccion[Acción del Usuario / Clic]
        PasoUI[Paso en la Interfaz de Usuario]
        ProcesoIA[Proceso de Inteligencia Artificial / Backend]
        Opcion[Opción / Decisión del Usuario]
    end

    classDef userAction fill:#E6FFFA,stroke:#A0AEC0,stroke-width:1px;
    classDef uiStep fill:#EBF4FF,stroke:#A0AEC0,stroke-width:1px;
    classDef aiProcess fill:#FFF5F5,stroke:#A0AEC0,stroke-width:1px;
    classDef option fill:#FEFCBF,stroke:#A0AEC0,stroke-width:1px;

    class Clic1,Clic2,Clic3,Clic4,Opt1,Opt2,Opt3 UsuarioAccion;
    class B,D,E,F PasoUI;
    class Proc1,Proc2,Proc2_Regenerate,Proc3 ProcesoIA;
    class DescTXT,DescPDF uiStep;