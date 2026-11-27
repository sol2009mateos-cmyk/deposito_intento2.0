// Supabase entrega como máximo 1000 filas por pedido y corta el resto sin avisar.
// Esta función pide por tandas de 1000 hasta traer todo (si hay menos de 1000, es un solo pedido).
// Cada pedido tiene que estar ordenado de forma estable (por ejemplo, terminando en .order('id')).

const TANDA = 1000
const MAXIMO = 100000

type Respuesta<T> = {
  data: T[] | null
  error: { message: string } | null
}

export async function traerTodo<T>(
  pedir: (desde: number, hasta: number) => PromiseLike<Respuesta<T>>
): Promise<{ data: T[]; error: { message: string } | null }> {
  const todo: T[] = []

  for (let desde = 0; desde < MAXIMO; desde += TANDA) {
    const { data, error } = await pedir(desde, desde + TANDA - 1)
    if (error) return { data: [], error }

    const tanda = data ?? []
    todo.push(...tanda)
    if (tanda.length < TANDA) break
  }

  return { data: todo, error: null }
}
