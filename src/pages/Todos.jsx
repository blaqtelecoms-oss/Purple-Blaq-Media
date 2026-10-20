import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getTodos() {
      const { data, error: queryError } = await supabase.from('todos').select();

      if (queryError) {
        setError(queryError.message);
      } else {
        setTodos(data ?? []);
      }

      setIsLoading(false);
    }

    getTodos();
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-slate-900">
      <section className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold">Todos</h1>
        {isLoading ? (
          <p className="mt-6 text-slate-600">Loading todos...</p>
        ) : error ? (
          <p className="mt-6 text-red-700" role="alert">Could not load todos: {error}</p>
        ) : todos.length ? (
          <ul className="mt-6 divide-y divide-slate-200">
            {todos.map((todo) => (
              <li className="py-3" key={todo.id}>{todo.name}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-slate-600">No todos found.</p>
        )}
      </section>
    </main>
  );
}