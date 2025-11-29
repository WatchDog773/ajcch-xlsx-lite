Esta libreria es solo para leer excels, solo eso y posiblemente de una sola pagina, porque me dio hueva hacer mas, es mi librerias y yo decido que hacer con ella.

"La dependencia es una debilidad, y el abandono es la chispa. Que se guarden sus parches inútiles. Al igual que Torvalds forjó su destino, yo forjaré el mío: crearé mi propia solución ¡con juegos de azar y mujerzuelas!"
By AJCCH => Dr Manhattan

<pre>
                .-.
                (   )
                 '-'
                 J L
                 | |
                J   L
                |   |
               J     L
             .-'.___.'-.
            /___________\
       _.-""'           \`bmw._
     .'                       \`.
   J                            \`.
  F                               L
 J                                 J
J                                  \`
|                                   L
|                                   |
|                                   |
|                                   J
|                                    L
|                                    |
|             ,.___          ___....--._
|           ,'     \`""""""""'           \`-._
|          J           _____________________\`-.
|         F         .-'   \`-88888-'    \`Y8888b.\`.
|         |       .'         \`P'         \`88888b \
|         |      J       #     L      #    q8888b L
|         |      |             |           )8888D )
|         J      \             J           d8888P P
|          L      \`.         .b.         ,88888P /
|           \`.      \`-.___,o88888o.___,o88888P'.'
|             \`-.__________________________..-'
|                                    |
|         .-----.........____________J
|       .' |       |      |       |
|      J---|-----..|...___|_______|
|      |   |       |      |       |
|      Y---|-----..|...___|_______|
|       \`. |       |      |       |
|         \`'-------:....__|______.J
|                                  |
 L___                              |
     """----...______________....--'
</pre>

       Gracias por instalar *ajcch-xlsx-lite* ❤️
       Excel puro, sin SheetJS, sin dependencias.
       Hecho a mano, con odio y determinación. 🔥

# Instrucciones de uso

## Instalacion
1. Node.js 18+ instalado.
2. Instala la libreria:

```bash
npm install ajcch-xlsx-lite
```

## Uso en Node
Lee el archivo XLSX con `fs`, conviertelo a ArrayBuffer y pasalo a `readXlsxMatrix`.
```ts
import { readFileSync } from "fs";
import { readXlsxMatrix } from "ajcch-xlsx-lite";

const fileBuffer = readFileSync("./data/prueba.xlsx");
const arrayBuffer = fileBuffer.buffer.slice(
  fileBuffer.byteOffset,
  fileBuffer.byteOffset + fileBuffer.byteLength
);

const matrix = await readXlsxMatrix(arrayBuffer);
console.log(matrix);
```

## Seleccionar hoja especifica
Pasa un nombre parcial de la hoja; si no la encuentra, devuelve matriz vacia.
```ts
const matrix = await readXlsxMatrix(arrayBuffer, {
  sheetNameContains: "inventario",
});
```

## Mapear la matriz a objetos tipados
Usa la primera fila como encabezados para transformar el resto en objetos.
```ts
import { mapMatrixToObjects } from "ajcch-xlsx-lite";

const items = mapMatrixToObjects(matrix, (row) => ({
  nombre: row.Nombre,
  cantidad: Number(row.Cantidad ?? 0),
}));
```

## Notas
- Solo lectura: no escribe ni modifica el XLSX.
- Sin dependencias externas (sin SheetJS).
- Enfocada en casos simples: sin formulas complejas ni estilos avanzados.
