import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getPb } from "@/lib/pocketbase";

export type Turma = {
  id: string;
  nome: string;
  sigla: string;
  ativa: boolean;
};

type TurmaContextType = {
  turmas: Turma[];
  selectedTurmaId: string | null;
  selectedTurma: Turma | null;
  selectTurma: (id: string) => void;
  loading: boolean;
  reload: () => Promise<void>;
};

const TurmaContext = createContext<TurmaContextType | null>(null);

const STORAGE_KEY = "controle-links.turma";

function getStoredTurmaId(): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function setStoredTurmaId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

export function TurmaProvider({ children }: { children: React.ReactNode }) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(
    getStoredTurmaId,
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const pb = getPb();
    try {
      const list = await pb
        .collection("turmas")
        .getFullList<Turma>({ sort: "nome", requestKey: null });
      setTurmas(list);

      // Se a turma salva não existe mais ou nada está selecionado, escolhe a 1ª ativa
      const validSelected = list.find((t) => t.id === selectedTurmaId);
      if (!validSelected && list.length > 0) {
        const firstAtiva = list.find((t) => t.ativa) ?? list[0];
        setSelectedTurmaId(firstAtiva.id);
        setStoredTurmaId(firstAtiva.id);
      } else if (!validSelected) {
        // Sem turmas e tinha algo selecionado no localStorage: limpa.
        setSelectedTurmaId(null);
        setStoredTurmaId(null);
      }
    } catch {
      // Collection `turmas` não existe (migration não rodou) ou outro
      // erro. Limpa qualquer seleção stale para evitar filtros com ID
      // que não existe — o que faria as queries devolverem vazio.
      setTurmas([]);
      setSelectedTurmaId(null);
      setStoredTurmaId(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function selectTurma(id: string) {
    setSelectedTurmaId(id);
    setStoredTurmaId(id);
  }

  const selectedTurma = turmas.find((t) => t.id === selectedTurmaId) ?? null;

  return (
    <TurmaContext.Provider
      value={{
        turmas,
        selectedTurmaId,
        selectedTurma,
        selectTurma,
        loading,
        reload,
      }}
    >
      {children}
    </TurmaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTurma(): TurmaContextType {
  const ctx = useContext(TurmaContext);
  if (!ctx) {
    throw new Error("useTurma must be used within a TurmaProvider");
  }
  return ctx;
}
