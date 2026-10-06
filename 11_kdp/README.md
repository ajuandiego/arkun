# Ficha KDP: Stolen Breath

Estos archivos son lo que se pega en Kindle Direct Publishing (KDP) al dar de alta el libro. El manuscrito ya está en `09_manuscript/`. Aquí no hay portada, precio ni ISBN: KDP no exige ISBN para el ebook, y un ISBN inventado no sirve.

El libro está en inglés. La ficha también. Si la tienda principal no es Amazon.com, las rutas de categoría cambian. Elige las tres más cercanas en el desplegable en vivo.

Orden en el formulario:

1. `detalles.md`: título, subtítulo, serie, autor, idioma, editorial, público.
2. `descripcion.html`: pega el bloque HTML en el campo Descripción. Si el editor se come las etiquetas, usa `descripcion.txt`.
3. `palabras_clave.txt`: una frase por caja. Son siete. No repitas el título ni el nombre del autor.
4. `categorias.md`: tres rutas para buscar en el selector.
5. `biografia.txt`: va en Author Central, no en la descripción del libro.
6. `contraportada.txt`: texto corto para la contraportada impresa. No lo metas en la descripción de KDP si ya usaste el otro.

La descripción no cuenta el final, la marca, ni el secuestro. El aviso 18+ sí entra, porque el libro lo declara en la página de copyright.

En `reader/scripts/build-epub.js` la descripción del EPUB sigue siendo otra historia (una subasta en las torres). No uses ese párrafo en KDP. No coincide con el manuscrito.
