import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type Props<Item> = {
  title: string;
  description: string;
  path: string;
  collection: string;
  emptyMessage: string;
  renderItem: (item: Item) => ReactNode;
};

type State<Item> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; items: Item[] };

export function CapabilityCard<Item>({ title, description, path, collection, emptyMessage, renderItem }: Props<Item>) {
  const [state, setState] = useState<State<Item>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    getJson<Record<string, Item[]>>(path)
      .then((response) => {
        if (active) setState({ status: 'loaded', items: response[collection] ?? [] });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Request failed',
          });
        }
      });
    return () => { active = false; };
  }, [path, collection]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {state.status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
        {state.status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}: {state.message}</p>}
        {state.status === 'loaded' && state.items.length === 0 && <p role="status">{emptyMessage}</p>}
        {state.status === 'loaded' && state.items.length > 0 && (
          <ul className="list-group list-group-flush">
            {state.items.map((item, index) => <li className="list-group-item px-0" key={index}>{renderItem(item)}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
