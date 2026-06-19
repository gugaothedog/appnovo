import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Plus, 
  Heart, 
  ArrowLeft, 
  Clock, 
  Users, 
  Check, 
  Trash2, 
  RotateCcw, 
  Search,
  BookMarked,
  Sparkles,
  Info,
  ChevronRight,
  PlusCircle,
  FileText,
  Star,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import { PRESET_RECIPES, Recipe } from "./data/presetRecipes";
import vovoAvatar from "./assets/images/vovo_avatar_1781440678195.jpg";
import { 
  db, 
  handleFirestoreError, 
  OperationType 
} from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  onSnapshot, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from "firebase/firestore";

export interface AppUser {
  uid?: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

export interface RecipeComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  userEmail?: string;
  recipeId?: string;
}

// Filtro de palavras impróprias/palavrões em português para proteção do ambiente
export const filterBadWords = (text: string): string => {
  if (!text) return text;
  const badWords = [
    /fdp/gi, /caralho/gi, /porra/gi, /bosta/gi, /cacete/gi, /viado/gi, 
    /puta/gi, /foder/gi, /foda/gi, /desgraça/gi, /corno/gi, /cu/gi, 
    /pau/gi, /filho da puta/gi, /buceta/gi, /arrombado/gi, /merda/gi,
    /idiota/gi, /imbecil/gi, /otario/gi, /babaca/gi, /corna/gi, /puto/gi,
    /retardado/gi, /bicha/gi, /piranha/gi, /vagina/gi, /v@gina/gi, /p\*rra/gi,
    /c\*ralho/gi, /p\*ta/gi, /m\*rda/gi, /penis/gi, /pênis/gi, /chupa/gi
  ];
  
  let filteredText = text;
  badWords.forEach(pattern => {
    filteredText = filteredText.replace(pattern, (match) => {
      // Substitui por caracteres especiais mantendo a primeira letra visível e o resto ocultado
      return match[0] + "*".repeat(match.length - 1);
    });
  });
  return filteredText;
};

// Cores Principais do Projeto Tema Bento Grid:
// Creme Suave (Background): bg-[#FDFBF7]
// Cinza/Marrom Escuro (Texto Principal): text-[#3C3633]
// Verde Sálvia/Oliva (Botão Principal/Destaques): bg-[#708238] com hover bg-[#5F702F]
// Verde Sálvia Claro / Contrastes: bg-[#708238]/10 ou bg-[#E4EAE1]
// Bordas Sólidas Bento Grid: border-[#3C3633] com shadow-[4px_4px_0px_0px_rgba(60,54,51,1)]

export default function App() {
  // --- ESTADOS DA APLICAÇÃO ---
  const [activeTab, setActiveTab] = useState<"ver_receitas" | "criar_receita" | "minhas_receitas">("ver_receitas");
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  
  // Lista de receitas combinando padrão (PRESET) e salvas no localStorage
  const [recipes, setRecipes] = useState<Recipe[]>(PRESET_RECIPES);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Filtros e Navegação Interna
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modos de Acessibilidade
  const [fontSize, setFontSize] = useState<"grande" | "gigante" | "mega">("grande");

  // Modo de visualização de receita: "tudo" (integral) ou "passo" (um passo por vez)
  const [recipeViewMode, setRecipeViewMode] = useState<"completa" | "passo-a-passo">("completa");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Lista interativa de checklist de ingredientes (salva o estado de progresso temporário)
  const [checkedIngredients, setCheckedIngredients] = useState<{ [key: string]: boolean }>({});

  // Controle de Slide do Carrossel e Posição Atual
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Formulário de Criação de Receita
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Bolos e Broas");
  const [newPrepTime, setNewPrepTime] = useState("");
  const [newPortions, setNewPortions] = useState("");
  const [newIngredientsText, setNewIngredientsText] = useState("");
  const [newInstructionsText, setNewInstructionsText] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newRatingSetting, setNewRatingSetting] = useState(5);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [recipeDetailFeedback, setRecipeDetailFeedback] = useState<string | null>(null);

  // --- SISTEMA DE CONTAS & COMENTÁRIOS ---
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [comments, setComments] = useState<{ [recipeId: string]: RecipeComment[] }>({});
  
  // Modal de Login/Registro
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  // Novos comentários
  const [newCommentText, setNewCommentText] = useState("");
  const [tempCommenterName, setTempCommenterName] = useState("");

  // Gerenciamento de receitas remotas e presets apagados em tempo real
  const [remoteRecipes, setRemoteRecipes] = useState<Recipe[]>([]);
  const [deletedPresetIds, setDeletedPresetIds] = useState<string[]>([]);
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("receitas_casa_locally_deleted") || "[]");
    } catch (_) {
      return [];
    }
  });
  const [locallyCreatedCommentIds, setLocallyCreatedCommentIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("receitas_casa_my_written_comments") || "[]");
    } catch (_) {
      return [];
    }
  });

  // Estados para avaliações e estrelas interativas
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [userRatings, setUserRatings] = useState<{ [recipeId: string]: number }>(() => {
    try {
      return JSON.parse(localStorage.getItem("receitas_casa_user_ratings") || "{}");
    } catch (_) {
      return {};
    }
  });

  // Carregamento de Cozinheiros para o Admin Dashboard
  const [showAdminSystemPanel, setShowAdminSystemPanel] = useState(false);
  const [cookingUsers, setCookingUsers] = useState<any[]>([]);
  const [loadingCookingUsers, setLoadingCookingUsers] = useState(false);

  // Categorias preexistentes
  const categories = [
    { title: "Bolos e Broas", icon: "🍰", color: "bg-[#F3E6D0]" },
    { title: "Sopas e Caldos", icon: "🍲", color: "bg-[#E6EDDF]" },
    { title: "Almoço de Domingo", icon: "🍝", color: "bg-[#E8DCCF]" },
    { title: "Chás e Receitas de Vó", icon: "☕", color: "bg-[#DFEBE4]" },
    { title: "Sobremesas e Doces", icon: "🍨", color: "bg-[#F5EADF]" }
  ];

  // --- SYNC COM REAL-TIME FIREBASE ---
  // Sincronizar em tempo real para TODOS os usuários (com ou sem conta) verem receitas e comentários
  useEffect(() => {
    // 1. Sincronizar receitas em tempo real para todos (com ou sem conta logada)
    const unsubscribeRecipes = onSnapshot(collection(db, "recipes"), (snapshot) => {
      const remote: Recipe[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        remote.push({
          id: doc.id,
          title: data.title,
          category: data.category,
          description: data.description || "Receita caseira escrita com muito afeto no aplicativo.",
          prepTime: data.prepTime,
          portions: data.portions,
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          isPreset: false,
          imageUrl: data.imageUrl,
          rating: Math.min(5, Math.max(1, data.rating || 5)),
          ratingsCount: data.ratingsCount || 1,
          isPublic: data.isPublic !== false,
          userEmail: data.userEmail || data.email,
          authorId: data.authorId,
          authorName: data.authorName || "Cozinheiro"
        });
      });
      setRemoteRecipes(remote);
    }, (err) => {
      console.warn("Receitas offline ou falha de conexão com Firebase. Usando armazenado localmente:", err);
    });

    // 2. Sincronizar comentários em tempo real para todos (com ou sem conta logada)
    const unsubscribeComments = onSnapshot(collection(db, "comments"), (snapshot) => {
      const groupedComments: { [recipeId: string]: RecipeComment[] } = {};

      // Sincronizar apenas o conteúdo que de fato está no Firestore ou foi persistido mais recentemente
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (!d.recipeId) return;

        const c: RecipeComment = {
          id: doc.id,
          author: d.author || "Cozinheiro",
          text: d.text || "",
          timestamp: d.timestamp || "",
          userEmail: d.userEmail,
          recipeId: d.recipeId
        };

        if (!groupedComments[d.recipeId]) {
          groupedComments[d.recipeId] = [];
        }
        groupedComments[d.recipeId].push(c);
      });

      // Ordenar os comentários de cada receita em ordem decrescente de tempo (mais recentes no topo)
      Object.keys(groupedComments).forEach((rId) => {
        groupedComments[rId].sort((a, b) => {
          const timeA = a.id.startsWith("comment-") ? parseInt(a.id.replace("comment-", ""), 10) : 0;
          const timeB = b.id.startsWith("comment-") ? parseInt(b.id.replace("comment-", ""), 10) : 0;
          if (timeA && timeB) {
            return timeB - timeA;
          }
          return b.id.localeCompare(a.id);
        });
      });

      setComments(groupedComments);
      try {
        localStorage.setItem("receitas_casa_comentarios", JSON.stringify(groupedComments));
      } catch (_) {}
    }, (err) => {
      console.warn("Comentários offline ou sem conexão com Firebase:", err);
    });

    return () => {
      unsubscribeRecipes();
      unsubscribeComments();
    };
  }, []);

  // Sincronizar presets apagados em tempo real do Firestore
  useEffect(() => {
    const unsubscribeDeletedPresets = onSnapshot(collection(db, "deleted_presets"), (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach((doc) => {
        ids.push(doc.id);
      });
      setDeletedPresetIds(ids);
    }, (err) => {
      console.warn("Sem acesso online aos presets excluídos.", err);
    });
    return () => unsubscribeDeletedPresets();
  }, []);

  // Determina se a receita pertence ao usuário logado ou se foi criada de forma local offline neste navegador
  const isRecipeOwner = (rec: Recipe) => {
    if (rec.isPreset) return false;
    
    // Se for uma receita criada offline local (sem userEmail e autorId)
    const isLocalOffline = !rec.authorId && !rec.userEmail;
    if (isLocalOffline) return true;

    if (currentUser) {
      if (currentUser.isAdmin) return true;
      if (rec.authorId === currentUser.uid) return true;
      if (rec.userEmail && currentUser.email && rec.userEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) return true;
    }

    return false;
  };

  // Recalcular receitas ativas combinando presets ativos (com avaliações locais se aplicável) + receitas remotas + receitas offline locais
  useEffect(() => {
    const activePresets = PRESET_RECIPES.filter(p => !deletedPresetIds.includes(p.id) && !locallyDeletedIds.includes(p.id));
    
    // Obter as avaliações locais para os presets criados no dispositivo
    const presetRatingsStr = localStorage.getItem("receitas_casa_preset_ratings") || "{}";
    let presetRatings: Record<string, { rating: number, count: number }> = {};
    try { presetRatings = JSON.parse(presetRatingsStr); } catch (_) {}

    const mappedPresets = activePresets.map(p => {
      if (presetRatings[p.id]) {
        return {
          ...p,
          rating: Math.min(5, Math.max(1, presetRatings[p.id].rating)),
          ratingsCount: presetRatings[p.id].count
        };
      }
      return p;
    });

    // Obter as receitas customizadas offline salvas no dispositivo
    let localCustom: Recipe[] = [];
    const savedCustomRecipes = localStorage.getItem("receitas_casa_custom");
    if (savedCustomRecipes) {
      try {
        localCustom = JSON.parse(savedCustomRecipes);
      } catch (_) {}
    }

    // Evita duplicar receitas que já existam na lista remota carregada do Firestore
    const remoteIds = new Set(remoteRecipes.map(r => r.id));
    const uniqueLocalCustom = localCustom.filter(r => !remoteIds.has(r.id)).map(r => {
      return {
        ...r,
        authorName: r.authorName || "Cozinheiro"
      };
    });

    const combined = [...mappedPresets, ...remoteRecipes, ...uniqueLocalCustom];
    const filtered = combined.filter(r => !locallyDeletedIds.includes(r.id) && !deletedPresetIds.includes(r.id));
    setRecipes(filtered);
  }, [remoteRecipes, deletedPresetIds, locallyDeletedIds]);

  // Sincronizar dados do usuário (Custom Auth) e Favoritos correspondentes
  useEffect(() => {
    // Carregar usuário do localStorage na montagem
    const storedUserStr = localStorage.getItem("receitas_casa_custom_user");
    if (storedUserStr) {
      try {
        const u = JSON.parse(storedUserStr);
        // Garantir que a flag de admin esteja correta baseada no email se for o Luiz Gustavo
        const emailLower = u.email ? u.email.trim().toLowerCase() : "";
        u.isAdmin = emailLower === "luizgustavo14102010@gmail.com";
        setCurrentUser(u);
      } catch (_) {}
    }
  }, []);

  // Sincronizar nome do criador com usuário logado
  useEffect(() => {
    if (currentUser && currentUser.name) {
      setNewAuthorName(currentUser.name);
    } else {
      setNewAuthorName("");
    }
  }, [currentUser]);

  // Monitorar alterações de currentUser e sincronizar receitas favoritas do Firestore
  useEffect(() => {
    let unsubscribeFavs: (() => void) | null = null;

    if (currentUser && currentUser.uid) {
      const favsQuery = query(collection(db, "favorites"), where("userId", "==", currentUser.uid));
      unsubscribeFavs = onSnapshot(favsQuery, (snapshot) => {
        const favList: string[] = [];
        snapshot.forEach((doc) => {
          favList.push(doc.data().recipeId);
        });
        setFavorites(favList);
      }, (err) => {
        console.warn("Erro ao sincronizar favoritos do Firestore", err);
      });
    } else {
      // Carrega favoritos locais
      const savedFavorites = localStorage.getItem("receitas_casa_favoritos");
      if (savedFavorites) {
        try {
          const parsed = JSON.parse(savedFavorites);
          if (Array.isArray(parsed)) {
            setFavorites(parsed);
          }
        } catch (_) {}
      } else {
        setFavorites([]);
      }
    }

    return () => {
      if (unsubscribeFavs) {
        unsubscribeFavs();
      }
    };
  }, [currentUser]);

  // Carregar cache local do localStorage uma única vez na inicialização
  useEffect(() => {
    // Carrega as receitas customizadas locais como fallback complementar
    const savedCustomRecipes = localStorage.getItem("receitas_casa_custom");
    if (savedCustomRecipes) {
      try {
        const parsed = JSON.parse(savedCustomRecipes);
        if (Array.isArray(parsed)) {
          setRecipes((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const newToAdd = parsed.filter((r) => !existingIds.has(r.id));
            return [...prev, ...newToAdd];
          });
        }
      } catch (_) {}
    }

    // Carrega comentários locais complementares
    const savedComments = localStorage.getItem("receitas_casa_comentarios");
    if (savedComments) {
      try {
        const parsed = JSON.parse(savedComments);
        setComments((prev) => {
          const merged = { ...prev };
          Object.keys(parsed).forEach((recipeId) => {
            const existing = merged[recipeId] || [];
            const existingIds = new Set(existing.map((c) => c.id));
            const newComments = parsed[recipeId].filter((c: any) => !existingIds.has(c.id));
            merged[recipeId] = [...existing, ...newComments];
          });
          return merged;
        });
      } catch (_) {}
    }
  }, []);

  // --- ARQUIVOS DE MÍDIA - COMPRESSOR DE IMAGEM DA PESSOA QUE CRIOU A RECEITA ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 450;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Salva em formato JPEG bem comprimido para não atingir o limite de tamanho do localStorage
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.65);
            setNewImageUrl(compressedBase64);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // --- CONTROLES AUXILIARES DO CARROSSEL LATERAL ---
  const handleCarouselScroll = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const width = carouselRef.current.clientWidth || 320;
      const index = Math.round(scrollLeft / (width - 40)); // Compensar padding lateral amigável
      setActiveCardIndex(index);
    }
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const el = carouselRef.current;
      const card = el.querySelector(".recipe-carousel-card");
      const cardWidth = card ? card.clientWidth : 290;
      const scrollGap = 20; // gap-5 em pixels
      const step = cardWidth + scrollGap;
      el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
    }
  };

  const scrollToCard = (index: number) => {
    if (carouselRef.current) {
      const el = carouselRef.current;
      const card = el.querySelector(".recipe-carousel-card");
      const cardWidth = card ? card.clientWidth : 290;
      const scrollGap = 20;
      el.scrollTo({ left: index * (cardWidth + scrollGap), behavior: "smooth" });
      setActiveCardIndex(index);
    }
  };

  // Reset de estados se mudar de tela ou receita
  useEffect(() => {
    setCheckedIngredients({});
    setCurrentStepIndex(0);
    setRecipeDetailFeedback(null);
  }, [selectedRecipe, activeTab, selectedCategory]);

  // --- HISTÓRICO COM BOTÃO VOLTAR DO CELULAR (INTERCEPTAÇÃO POPSTATE) ---
  // Iniciar estado na história para a página inicial com carinho de vó
  useEffect(() => {
    const initialState = {
      activeTab: "ver_receitas",
      selectedCategoryId: null,
      selectedRecipeId: null,
      editingRecipeId: null,
      showAdminSystemPanel: false,
      isAuthModalOpen: false,
      receitasCasaState: true
    };
    if (!window.history.state || !window.history.state.receitasCasaState) {
      window.history.replaceState(initialState, "");
    }
  }, []);

  // Publicar alterações ao navegar para um novo elemento/tela (Push State)
  useEffect(() => {
    const currentState = {
      activeTab,
      selectedCategoryId: selectedCategory || null,
      selectedRecipeId: selectedRecipe ? selectedRecipe.id : null,
      editingRecipeId,
      showAdminSystemPanel,
      isAuthModalOpen,
      receitasCasaState: true
    };

    const browserState = window.history.state;
    // Se o estado atual do navegador for diferente do nosso estado, nós enviamos pushState para empilhar no histórico
    if (browserState && browserState.receitasCasaState) {
      const isDifferent = 
        browserState.activeTab !== currentState.activeTab ||
        browserState.selectedCategoryId !== currentState.selectedCategoryId ||
        browserState.selectedRecipeId !== currentState.selectedRecipeId ||
        browserState.editingRecipeId !== currentState.editingRecipeId ||
        browserState.showAdminSystemPanel !== currentState.showAdminSystemPanel ||
        browserState.isAuthModalOpen !== currentState.isAuthModalOpen;

      if (isDifferent) {
        window.history.pushState(currentState, "");
      }
    } else {
      window.history.pushState(currentState, "");
    }
  }, [activeTab, selectedCategory, selectedRecipe, editingRecipeId, showAdminSystemPanel, isAuthModalOpen]);

  // Escutar o botão de voltar do celular/navegador (POPSTATE)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.receitasCasaState) {
        // Atualizar os estados internos do React baseados no histórico recuperado da pilha
        setActiveTab(state.activeTab);
        setSelectedCategory(state.selectedCategoryId);
        setEditingRecipeId(state.editingRecipeId);
        setShowAdminSystemPanel(state.showAdminSystemPanel);
        setIsAuthModalOpen(!!state.isAuthModalOpen);
        
        if (state.selectedRecipeId) {
          // Procurar receita selecionada para restaurá-la na tela do usuário
          const found = recipes.find(r => r.id === state.selectedRecipeId);
          setSelectedRecipe(found || null);
        } else {
          setSelectedRecipe(null);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [recipes]);

  // --- FAVORITAR RECEITA ---
  const handleToggleFavorite = async (recipeId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    
    if (currentUser && currentUser.uid) {
      const favId = `${currentUser.uid}_${recipeId}`;
      const isFav = favorites.includes(recipeId);
      try {
        if (isFav) {
          await deleteDoc(doc(db, "favorites", favId));
        } else {
          await setDoc(doc(db, "favorites", favId), {
            userId: currentUser.uid,
            recipeId: recipeId,
            createdAt: serverTimestamp()
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `favorites/${favId}`);
      }
    } else {
      let updated: string[];
      if (favorites.includes(recipeId)) {
        updated = favorites.filter(id => id !== recipeId);
      } else {
        updated = [...favorites, recipeId];
      }
      setFavorites(updated);
      localStorage.setItem("receitas_casa_favoritos", JSON.stringify(updated));
    }
  };

  // --- EXCLUIR RECEITA DO USUÁRIO ---
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  const handleDeleteCustomRecipe = (recipeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setRecipeToDelete(recipeId);
  };

  const confirmDeleteRecipe = async (recipeId: string) => {
    try {
      const isPreset = PRESET_RECIPES.some(r => r.id === recipeId);
      const targetRecipe = recipes.find(r => r.id === recipeId);

      // Sempre adicionar à lista de excluídas localmente para sumir imediatamente deste dispositivo
      const updatedLocallyDeleted = [...locallyDeletedIds, recipeId];
      setLocallyDeletedIds(updatedLocallyDeleted);
      localStorage.setItem("receitas_casa_locally_deleted", JSON.stringify(updatedLocallyDeleted));

      // Remove de favoritos para o usuário atual
      if (currentUser && currentUser.uid) {
        const favId = `${currentUser.uid}_${recipeId}`;
        try {
          await deleteDoc(doc(db, "favorites", favId));
        } catch (_) {}
      } else {
        const updatedFavs = favorites.filter(id => id !== recipeId);
        setFavorites(updatedFavs);
        localStorage.setItem("receitas_casa_favoritos", JSON.stringify(updatedFavs));
      }

      if (isPreset) {
        if (currentUser?.isAdmin) {
          // Apagar Preset definitivamente como Admin
          await setDoc(doc(db, "deleted_presets", recipeId), {
            deletedAt: new Date().toISOString(),
            recipeId: recipeId
          });
        }
      } else {
        // Se for receita customizada no Firestore:
        if (targetRecipe) {
          const isAuthor = isRecipeOwner(targetRecipe);
          const hasDbWriteAccess = isAuthor || currentUser?.isAdmin;
          if (currentUser && currentUser.uid && hasDbWriteAccess) {
            await deleteDoc(doc(db, "recipes", recipeId));
          }
        }

        // Se quem está deletando for Admin, registrar no "deleted_presets" de doadores para sumir de todos os outros dispositivos na hora!
        if (currentUser?.isAdmin) {
          await setDoc(doc(db, "deleted_presets", recipeId), {
            deletedAt: new Date().toISOString(),
            recipeId: recipeId
          });
        }

        // Se for receita customizada offline salva localmente no localStorage
        const savedCustom = localStorage.getItem("receitas_casa_custom");
        const parsed: Recipe[] = savedCustom ? JSON.parse(savedCustom) : [];
        const filteredCustom = parsed.filter(r => r.id !== recipeId);
        localStorage.setItem("receitas_casa_custom", JSON.stringify(filteredCustom));
      }

      if (selectedRecipe && selectedRecipe.id === recipeId) {
        setSelectedRecipe(null);
      }
    } catch (e) {
      console.error("Erro ao apagar receita", e);
    }
  };

  // --- ALTERAR PRIVACIDADE DA RECEITA (PÚBLICA / PRIVADA) ---
  const handleTogglePrivacy = async (recipeId: string) => {
    setRecipeDetailFeedback(null);
    try {
      if (currentUser && currentUser.uid) {
        const recipeRef = doc(db, "recipes", recipeId);
        const recipeDoc = await getDoc(recipeRef);
        if (recipeDoc.exists()) {
          const data = recipeDoc.data();
          const currentPublic = data.isPublic !== false;
          const targetPublic = !currentPublic;

          // REGRA DE NEGÓCIO: Se for passar de Privada para Pública, exige que tenha foto real (starts with data:image/)
          if (targetPublic) {
            const hasRealPhoto = data.imageUrl && data.imageUrl.startsWith("data:image/");
            if (!hasRealPhoto) {
              setRecipeDetailFeedback("⚠️ Ops! Para publicar esta receita de forma pública para todos verem, você PRECISA adicionar uma foto real do seu prato! Envie uma foto carinhosamente usando o painel de upload abaixo.");
              return;
            }
          }

          await setDoc(recipeRef, {
            ...data,
            isPublic: targetPublic,
            updatedAt: serverTimestamp()
          });
          
          if (selectedRecipe && selectedRecipe.id === recipeId) {
            setSelectedRecipe(prev => prev ? { ...prev, isPublic: targetPublic } : null);
          }
        }
      } else {
        const savedCustom = localStorage.getItem("receitas_casa_custom");
        if (savedCustom) {
          const parsed: Recipe[] = JSON.parse(savedCustom);
          
          const targetRecipe = parsed.find(r => r.id === recipeId);
          if (targetRecipe) {
            const currentPublic = targetRecipe.isPublic !== false;
            const targetPublic = !currentPublic;
            
            if (targetPublic) {
              const hasRealPhoto = targetRecipe.imageUrl && targetRecipe.imageUrl.startsWith("data:image/");
              if (!hasRealPhoto) {
                setRecipeDetailFeedback("⚠️ Ops! Para publicar esta receita de forma pública para todos verem, você PRECISA adicionar uma foto real do seu prato! Envie uma foto carinhosamente usando o painel de upload abaixo.");
                return;
              }
            }
          }

          const updated = parsed.map(r => {
            if (r.id === recipeId) {
              const currentPublic = r.isPublic !== false; 
              const toggledPublic = !currentPublic;
              
              return { ...r, isPublic: toggledPublic };
            }
            return r;
          });
          localStorage.setItem("receitas_casa_custom", JSON.stringify(updated));
          
          // Atualizar lista local
          setRecipes([...PRESET_RECIPES, ...updated]);
          
          // Atualizar receita selecionada para atualizar a tela de detalhes
          if (selectedRecipe && selectedRecipe.id === recipeId) {
            const currentUpdated = updated.find(r => r.id === recipeId);
            if (currentUpdated) {
              setSelectedRecipe(currentUpdated);
            }
          }
        }
      }
    } catch (e) {
      console.error("Erro ao apagar receita", e);
    }
  };

  // --- ENVIAR OU ALTERAR FOTO REAL DE UMA RECEITA NO CADERNO ---
  const handleUpdateRecipePhoto = async (recipeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipeDetailFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 450;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Compressão de qualidade para base64 JPEG
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.65);

          try {
            if (currentUser && currentUser.uid) {
              const recipeRef = doc(db, "recipes", recipeId);
              const recipeDoc = await getDoc(recipeRef);
              if (recipeDoc.exists()) {
                const data = recipeDoc.data();
                await setDoc(recipeRef, {
                  ...data,
                  imageUrl: compressedBase64,
                  updatedAt: serverTimestamp()
                });
                
                // Atualizar estado da receita selecionada
                if (selectedRecipe && selectedRecipe.id === recipeId) {
                  setSelectedRecipe(prev => prev ? { ...prev, imageUrl: compressedBase64 } : null);
                }
                setRecipeDetailFeedback("Sua foto real do prato foi guardada com amor! 📸✨");
              }
            } else {
              const savedCustom = localStorage.getItem("receitas_casa_custom");
              if (savedCustom) {
                const parsed: Recipe[] = JSON.parse(savedCustom);
                const updated = parsed.map(r => {
                  if (r.id === recipeId) {
                    return { ...r, imageUrl: compressedBase64 };
                  }
                  return r;
                });
                localStorage.setItem("receitas_casa_custom", JSON.stringify(updated));
                
                // Atualizar listagem
                setRecipes([...PRESET_RECIPES, ...updated]);

                if (selectedRecipe && selectedRecipe.id === recipeId) {
                  const currentUpdated = updated.find(r => r.id === recipeId);
                  if (currentUpdated) {
                    setSelectedRecipe(currentUpdated);
                  }
                }
                setRecipeDetailFeedback("Sua foto real do prato foi guardada localmente! 📸✨");
              }
            }
          } catch (errUpdate) {
            console.error("Erro ao atualizar foto real", errUpdate);
            setRecipeDetailFeedback("Eita! Ocorreu um contratempo ao gravar sua foto. Tente de novo!");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- CONTROLE DE ACESSO (LOGIN / CADASTRO) COM COZINHEIRO CUSTOM AUTH ---
  // Esse sistema é 100% à prova de falhas em Android, WebViews e iframes porque não requer login externo,
  // salvando as informações diretamente no banco Firestore na tabela cooking_users, com fallback local robusto.
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);

    const emailLower = authEmail.trim().toLowerCase();
    const pass = authPassword.trim();

    if (!emailLower || !pass) {
      setAuthFeedback("Por favor, preencha o e-mail e a senha.");
      return;
    }

    if (pass.length < 6) {
      setAuthFeedback("Por segurança, a senha de login deve conter pelo menos 6 caracteres.");
      return;
    }

    try {
      // 1. Tentar ler no Firestore
      let userDocRef = null;
      let userSnap = null;
      let databaseErrorEncountered = false;

      try {
        userDocRef = doc(db, "cooking_users", emailLower);
        userSnap = await getDoc(userDocRef);
      } catch (fErr) {
        console.warn("Aviso: Conectando de forma desabilitada ou offline. Ativando contingência offline do banco:", fErr);
        databaseErrorEncountered = true;
      }

      const nickname = authName.trim() || emailLower.split("@")[0];
      const isAdminFlag = emailLower === "luizgustavo14102010@gmail.com";
      const generatedUid = `user-${Date.now()}`;

      if (authMode === "login") {
        let userData = null;

        // Se o banco de dados online respondeu normalmente
        if (userSnap && userSnap.exists()) {
          userData = userSnap.data();
        } else {
          // Fallback offline: procurar no cache de usuários locais salvos
          const savedOfflineUsers = localStorage.getItem("receitas_casa_offline_users") || "[]";
          let parsedOffline: any[] = [];
          try { parsedOffline = JSON.parse(savedOfflineUsers); } catch (_) {}
          const localMatch = parsedOffline.find(u => u.email === emailLower);
          if (localMatch) {
            userData = localMatch;
          }
        }

        if (!userData) {
          if (databaseErrorEncountered) {
            setAuthFeedback("Você está sem conexão ou em uma aba restrita. Crie sua conta na aba 'Criar Conta' para prosseguir localmente de forma offline!");
          } else {
            setAuthFeedback("Este e-mail ainda não está cadastrado. Que tal trocar para a aba 'Criar Conta'?");
          }
          return;
        }

        if (userData.password !== pass) {
          setAuthFeedback("A senha digitada está incorreta. Por favor, tente novamente com atenção!");
          return;
        }

        const loggedUser: AppUser = {
          uid: userData.uid || `user-${Date.now()}`,
          name: userData.name || emailLower.split("@")[0],
          email: emailLower,
          isAdmin: emailLower === "luizgustavo14102010@gmail.com"
        };

        localStorage.setItem("receitas_casa_custom_user", JSON.stringify(loggedUser));
        setCurrentUser(loggedUser);
        setIsAuthModalOpen(false);
        
        // Limpar campos
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
      } else {
        // Criar conta (Register)
        if (userSnap && userSnap.exists()) {
          setAuthFeedback("Este endereço de e-mail já está sendo usado por outro cozinheiro!");
          return;
        }

        // Também valida no backup offline local para evitar duplicidade de e-mail no mesmo navegador
        const savedOfflineUsers = localStorage.getItem("receitas_casa_offline_users") || "[]";
        let parsedOffline: any[] = [];
        try { parsedOffline = JSON.parse(savedOfflineUsers); } catch (_) {}
        if (parsedOffline.some(u => u.email === emailLower)) {
          setAuthFeedback("Este e-mail já foi cadastrado localmente no seu dispositivo!");
          return;
        }

        const newUserFields = {
          uid: generatedUid,
          name: nickname,
          email: emailLower,
          password: pass,
          isAdmin: isAdminFlag,
          createdAt: new Date().toISOString()
        };

        // Salvar cadastro no Firestore de forma assíncrona tolerando falhas
        if (userDocRef) {
          try {
            await setDoc(userDocRef, newUserFields);
            await setDoc(doc(db, "users", generatedUid), {
              name: nickname,
              email: emailLower,
              isAdmin: isAdminFlag
            });
          } catch (saveErr) {
            console.warn("Aviso de Gravação: Falha persistente ao cadastrar no servidor online. Salvando com segurança localmente.", saveErr);
          }
        }

        // SALVA SEMPRE NO BANCO OFFLINE LOCAL para garantir compatibilidade futura e login offline
        parsedOffline.push(newUserFields);
        localStorage.setItem("receitas_casa_offline_users", JSON.stringify(parsedOffline));

        const loggedUser: AppUser = {
          uid: generatedUid,
          name: nickname,
          email: emailLower,
          isAdmin: isAdminFlag
        };

        localStorage.setItem("receitas_casa_custom_user", JSON.stringify(loggedUser));
        setCurrentUser(loggedUser);
        setIsAuthModalOpen(false);

        // Limpar campos
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
      }
    } catch (err: any) {
      console.error("Erro no Custom Auth", err);
      const errMsg = err.message || String(err);
      if (errMsg.includes("auth/operation-not-allowed") || errMsg.includes("operation-not-allowed") || errMsg.includes("not-allowed")) {
        setAuthFeedback("Esta conta de e-mail ainda não existe ou o login está indisponível. Que tal clicar na aba 'Criar Conta' ali em cima para fazer o seu cadastro rapidinho? 🍳✨");
      } else {
        setAuthFeedback(`Ocorreu um imprevisto ao acessar o cadastro: ${errMsg}`);
      }
    }
  };

  const handleRateRecipe = async (recipeId: string, ratingValue: number) => {
    // Procurar a receita ativa
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    // Obter o valor da nota anterior se o usuário já tiver avaliado
    const oldRatingValue = userRatings[recipeId];
    const originalRating = Math.min(5, Math.max(1, recipe.rating || 5));
    const originalCount = recipe.ratingsCount || 1;

    let newCount = originalCount;
    let newRating = originalRating;

    if (oldRatingValue !== undefined) {
      // Se ele já avaliou e agora está clicando novamente para MUDAR a nota:
      if (oldRatingValue === ratingValue) {
        // Se clicar na mesma estrela, não faz nada
        return;
      }
      // O contador não sobe porque é o mesmo usuário mudando de ideia, apenas reajustamos a média
      const totalScore = originalRating * originalCount;
      newRating = parseFloat(((totalScore - oldRatingValue + ratingValue) / originalCount).toFixed(1));
    } else {
      // Se for a primeira vez avaliando este prato:
      newCount = originalCount + 1;
      newRating = parseFloat(((originalRating * originalCount + ratingValue) / newCount).toFixed(1));
    }

    // Limitar estritamente a no máximo 5 estrelas e no mínimo 1 estrela para não quebrar limites visuais
    newRating = Math.min(5, Math.max(1, newRating));

    if (!recipe.isPreset) {
      // Se for receita customizada no Firestore
      try {
        await setDoc(doc(db, "recipes", recipeId), {
          rating: newRating,
          ratingsCount: newCount
        }, { merge: true });
        
        // Atualizar estado local de receitas e detalhes imediatamente
        setRemoteRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, rating: newRating, ratingsCount: newCount } : r));
        setSelectedRecipe(prev => prev && prev.id === recipeId ? { ...prev, rating: newRating, ratingsCount: newCount } : prev);
        setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, rating: newRating, ratingsCount: newCount } : r));
      } catch (err) {
        console.error("Erro ao registrar avaliação online:", err);
      }
    } else {
      // Se for Preset, salvamos o rating localmente na lista de presets avaliados
      const presetRatingsStr = localStorage.getItem("receitas_casa_preset_ratings") || "{}";
      let presetRatings: Record<string, { rating: number, count: number }> = {};
      try { presetRatings = JSON.parse(presetRatingsStr); } catch (_) {}
      
      presetRatings[recipeId] = { rating: newRating, count: newCount };
      localStorage.setItem("receitas_casa_preset_ratings", JSON.stringify(presetRatings));

      // Atualizar no estado local forçando repintura imediata
      setSelectedRecipe(prev => prev && prev.id === recipeId ? { ...prev, rating: newRating, ratingsCount: newCount } : prev);
      setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, rating: newRating, ratingsCount: newCount } : r));
    }

    // Atualizar no estado e no localStorage das avaliações do usuário
    const newUserRatings = { ...userRatings, [recipeId]: ratingValue };
    setUserRatings(newUserRatings);
    localStorage.setItem("receitas_casa_user_ratings", JSON.stringify(newUserRatings));

    // Salvar na lista de avaliados localmente para retrocompatibilidade
    const ratedRecipesStr = localStorage.getItem("receitas_casa_rated_list") || "[]";
    let ratedList: string[] = [];
    try { ratedList = JSON.parse(ratedRecipesStr); } catch (_) {}
    if (!ratedList.includes(recipeId)) {
      ratedList.push(recipeId);
      localStorage.setItem("receitas_casa_rated_list", JSON.stringify(ratedList));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("receitas_casa_custom_user");
    setCurrentUser(null);
    setShowAdminSystemPanel(false);
    setIsAuthModalOpen(false);
  };

  const loadCookingUsers = async () => {
    if (currentUser && currentUser.email?.trim().toLowerCase() === "luizgustavo14102010@gmail.com") {
      setLoadingCookingUsers(true);
      try {
        const querySnapshot = await getDocs(collection(db, "cooking_users"));
        const list: any[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            email: doc.id,
            name: data.name,
            password: data.password,
            createdAt: data.createdAt,
            isAdmin: doc.id.trim().toLowerCase() === "luizgustavo14102010@gmail.com"
          });
        });

        list.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        setCookingUsers(list);
      } catch (e) {
        console.error("Erro ao carregar cozinheiros", e);
      } finally {
        setLoadingCookingUsers(false);
      }
    }
  };

  // --- CONTROLE DE COMENTÁRIOS COM PERSISTÊNCIA ---
  const handleSaveComment = async (recipeId: string) => {
    const commentTextToSave = newCommentText.trim();
    if (!commentTextToSave) {
      return;
    }

    const commenterName = currentUser 
      ? currentUser.name 
      : (tempCommenterName.trim() || "Visitante");

    // Aplicar filtro de segurança contra palavrões e expressões ofensivas
    const sanitizedText = filterBadWords(commentTextToSave);
    const sanitizedAuthor = filterBadWords(commenterName);

    const timestampStr = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const commentId = `comment-${Date.now()}`;

    const newCommentObj: RecipeComment = {
      id: commentId,
      author: sanitizedAuthor,
      text: sanitizedText,
      timestamp: timestampStr,
      userEmail: currentUser ? currentUser.email : "Visitante (Sem Conta)",
      recipeId
    };

    // 1. Atualizar o estado local imediatamente de forma otimista
    setComments((prev) => {
      const updated = { ...prev };
      const list = updated[recipeId] ? [...updated[recipeId]] : [];
      if (!list.some(c => c.id === commentId)) {
        list.unshift(newCommentObj); // Novo comentário no topo instantaneamente
      }
      updated[recipeId] = list;
      return updated;
    });

    // 2. Salvar também no cache localStorage local de contingência imediata
    try {
      const saved = localStorage.getItem("receitas_casa_comentarios");
      let parsed: { [recipeId: string]: RecipeComment[] } = saved ? JSON.parse(saved) : {};
      if (!parsed[recipeId]) {
        parsed[recipeId] = [];
      }
      if (!parsed[recipeId].some(c => c.id === commentId)) {
        parsed[recipeId].unshift(newCommentObj);
      }
      localStorage.setItem("receitas_casa_comentarios", JSON.stringify(parsed));
    } catch (_) {}

    setNewCommentText("");

    const updatedLocalComments = [...locallyCreatedCommentIds, commentId];
    setLocallyCreatedCommentIds(updatedLocalComments);
    try {
      localStorage.setItem("receitas_casa_my_written_comments", JSON.stringify(updatedLocalComments));
    } catch (_) {}

    // 3. Enviar gravação em background assíncrono para o Firestore na nuvem
    try {
      await setDoc(doc(db, "comments", commentId), {
        id: commentId,
        recipeId,
        author: sanitizedAuthor,
        text: sanitizedText,
        timestamp: timestampStr,
        userEmail: currentUser ? currentUser.email : "Visitante (Sem Conta)",
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Não foi possível enviar para o Firebase na nuvem, mantendo salvo apenas no dispositivo localmente:", err);
    }
  };

  const handleDeleteComment = async (recipeId: string, commentId: string) => {
    // Feedback visual imediato antes da resposta do servidor
    setComments((prev) => {
      const updated = { ...prev };
      if (updated[recipeId]) {
        updated[recipeId] = updated[recipeId].filter(c => c.id !== commentId);
      }
      try {
        localStorage.setItem("receitas_casa_comentarios", JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    if (currentUser && currentUser.uid) {
      try {
        await deleteDoc(doc(db, "comments", commentId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `comments/${commentId}`);
      }
    }
  };

  // --- 50 DESCRIÇÕES PRE-FEITAS COM CARINHO DE VÓ ---
  const PREMADE_DESCRIPTIONS = [
    "Uma verdadeira lindeza caseira preparada com muito carinho e ingredientes especiais!",
    "Aquele aroma maravilhoso que abraça a casa inteira e reúne todo mundo ao redor da mesa.",
    "Uma gostosura autêntica que conforta o coração e esquenta a alma de toda a família.",
    "Receita abençoada direto do nosso caderno de família, feita para recordar bons momentos.",
    "Com sabor de tarde ensolarada no quintal da vó e conversa boa jogada fora.",
    "Um segredo culinário guardado a sete chaves, agora compartilhado com muito amor.",
    "Preparado com paciência, dedicação e pitadas generosas de afeto e nostalgia.",
    "Aquece até os dias mais cinzentos trazendo lembranças doces do aconchego de casa.",
    "Para lamber os dedos e repetir o prato sem qualquer pressa de terminar a refeição.",
    "A receita perfeita para acompanhar um cafezinho passado na hora e um bom abraço.",
    "Lembrança viva da infância, com cheirinho de bolo assando e riso solto na cozinha.",
    "Feito devagarinho, respeitando o tempo de cada ingrediente, como a vida deve ser.",
    "Uma delícia dourada que enche os olhos e alimenta a alma de quem a gente mais ama.",
    "Aquela combinação simples e extraordinária que transforma qualquer dia comum em festa.",
    "O verdadeiro prato do afeto: aconchegante, cheiroso, quentinho e perfeitamente saboroso.",
    "Um pedacinho de céu em forma de comida, preparado com a máxima dedicação.",
    "Receita rústica e cheia de personalidade, inspirada nos melhores banquetes de fazenda.",
    "Aquele prato irresistível que faz todo mundo esquecer do resto do mundo na hora de comer.",
    "Feito com ingredientes simples e comuns, mas com um toque mágico de puro carinho de vó.",
    "Sabor nostálgico que atravessa gerações e sempre traz um sorriso sincero ao rosto.",
    "Uma textura que derrete na boca e deixa um gostinho persistente de quero mais.",
    "A clássica merenda de domingo, ideal para reatar elos e aproximar pessoas queridas.",
    "Temperado com amor, risadas ao redor do fogão a lenha e lembranças inesquecíveis.",
    "Uma mistura divina que desperta os melhores sentidos e acalma qualquer coração cansado.",
    "Preparado do jeitinho clássico, sem pressa, com aquela dedicação que só quem ama tem.",
    "Comida de verdade, feita para nutrir o corpo e adoçar a vida com delicadeza e simplicidade.",
    "Aquele quitute especial que tem o poder de transformar uma reunião simples num banquete.",
    "Receita simples e saborosa que passa de geração em geração enchendo a casa de alegria.",
    "Perfeito para saborear com quem se ama, compartilhando histórias e sorrisos carinhosos.",
    "A delícia que faltava para deixar a sua tarde de chá ainda mais aconchegante e feliz.",
    "Aquela receita reconfortante que parece um abraço quentinho em forma de comida.",
    "Uma explosão sutil de sabores rústicos que evoca as melhores memórias de infância.",
    "Feito com muito afeto e aquele toque especial que só as grandes panelas de família têm.",
    "Uma verdadeira joia da culinária afetiva, preparada com toda a paciência e dedicação.",
    "O ponto perfeito entre a tradição e o amor, servido quentinho direto do forno.",
    "Aquele gostinho de fogão de vó que acorda os sentidos e reaviva momentos felizes.",
    "Para saborear devagar, apreciando cada colherada e o aroma que ficou no ar.",
    "Receitinha abençoada que espanta qualquer tristeza com sua simplicidade irresistível.",
    "O acompanhamento perfeito para aquela conversa comprida na mesa da cozinha.",
    "Um clássico da nossa casa que nunca falha em arrancar elogios e sorrisos de todos.",
    "Cheirinho de tempero fresco moído na hora e carinho que transborda em cada detalhe.",
    "Uma refeição abençoada para compartilhar no domingo de sol com toda a família reunida.",
    "A receita curinga do nosso coração, feita com dedicação máxima e amor sem medidas.",
    "Gostinho de comida feita na roça, com ingredientes frescos e amor tradicional.",
    "Feito com capricho e ternura, perfeito para quem aprecia a verdadeira essência do lar.",
    "Comida que afaga a alma e resgata doces lembranças de tempos mais simples.",
    "Aquele prato dourado e convidativo que faz as visitas se sentirem em casa imediatamente.",
    "Receita de ouro para alegrar qualquer tarde regada a causos antigos e gargalhadas.",
    "Feito para impressionar pelo afeto e simplicidade de uma cozinha genuinamente acolhedora.",
    "Uma gostosura feita à moda antiga que preserva o sabor autêntico do nosso caderno de receitas."
  ];

  // --- INICIAR EDIÇÃO DE UMA RECEITA EXISTENTE ---
  const handleStartEditRecipe = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setNewTitle(recipe.title);
    setNewCategory(recipe.category);
    setNewPrepTime(recipe.prepTime);
    
    // extrair porções
    if (recipe.portions) {
      const parts = recipe.portions.split(" ");
      setNewPortions(parts[0] || "");
    } else {
      setNewPortions("");
    }
    
    setNewIngredientsText(recipe.ingredients.join("\n"));
    setNewInstructionsText(recipe.instructions.join("\n"));
    setNewDescription(recipe.description || "");
    setNewImageUrl(recipe.imageUrl || "");
    setNewIsPublic(recipe.isPublic !== false);
    
    // Mudar de aba para "criar_receita"
    setActiveTab("criar_receita");
    // Desmarcar receita selecionada
    setSelectedRecipe(null);
  };

  // --- SALVAR OU ATUALIZAR RECEITA ---
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      // Verificações robustas com feedback amigável para idosos
      const missingFields: string[] = [];
      if (!newTitle.trim()) {
        missingFields.push("Qual é o nome do seu prato?");
      }
      if (!newPrepTime.trim()) {
        missingFields.push("Tempo para fazer");
      }
      if (!newPortions.trim()) {
        missingFields.push("Rendimento");
      }
      if (!newIngredientsText.trim()) {
        missingFields.push("Quais são os ingredientes?");
      }
      if (!newInstructionsText.trim()) {
        missingFields.push("Como preparar o prato?");
      }

      if (missingFields.length > 0) {
        setFormFeedback(
          `Atenção: Você esqueceu de preencher alguns campos importantes! 👵 Por favor, preencha: ${missingFields.join(", ")}. Escreva com carinho antes de salvar!`
        );
        return;
      }

      // Se for publicar de forma pública, exige foto
      if (newIsPublic && !newImageUrl.trim()) {
        setFormFeedback(
          "Para publicar a receita de forma pública para todos verem, você precisa adicionar uma linda foto do seu prato! 📸 Se não tiver foto agora, clique em '🔒 SÓ NO CADERNO' para guardar de forma particular no seu caderno de receitas."
        );
        return;
      }

      setIsSaving(true);
      setFormFeedback(null);

      const finalAuthorName = currentUser?.name?.trim() || "Cozinheiro Visitante";

      // Processamento de listas
      const ingredientsArray = newIngredientsText
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const instructionsArray = newInstructionsText
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const newCategoryToSave = newCategory || "Bolos e Broas";

      // Legenda personalizada opcional do usuário ou surpresa de vó imediata (100% livre de IA, instantâneo e otimizado)
      const finalDescription = newDescription.trim()
        ? newDescription.trim()
        : PREMADE_DESCRIPTIONS[Math.floor(Math.random() * PREMADE_DESCRIPTIONS.length)];
      
      const createdId = `custom-${Date.now()}`;
      const fallbackImages: { [key: string]: string } = {
        "Bolos e Broas": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=600",
        "Sopas e Caldos": "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=600",
        "Almoço de Domingo": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
        "Chás e Receitas de Vó": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600",
        "Sobremesas e Doces": "https://images.unsplash.com/photo-1533782654613-826a072dd6f3?auto=format&fit=crop&q=80&w=600"
      };

      const finalImageUrl = newImageUrl || fallbackImages[newCategoryToSave] || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600";
      const finalRating = Math.min(5, newRatingSetting || 5.0);

      const existingRecipe = recipes.find(r => r.id === editingRecipeId);
      const isLocalStorageOnly = existingRecipe ? (!existingRecipe.authorId && !existingRecipe.userEmail) : true;
      const isEditing = !!editingRecipeId;
      const savedRecipeId = isEditing && editingRecipeId ? editingRecipeId : createdId;

      if (currentUser && currentUser.uid && !isLocalStorageOnly) {
        // Salvar no Firestore de forma persistente e segura INSTANTANEAMENTE
        const recipeObjToSave: any = {
          title: newTitle.trim(),
          category: newCategoryToSave,
          description: finalDescription,
          prepTime: newPrepTime.trim(),
          portions: newPortions.trim().endsWith(" porções") ? newPortions.trim() : `${newPortions.trim()} porções`,
          ingredients: ingredientsArray,
          instructions: instructionsArray,
          imageUrl: finalImageUrl,
          authorId: existingRecipe?.authorId || currentUser.uid,
          authorName: existingRecipe?.authorName || finalAuthorName,
          isPublic: newIsPublic,
          userEmail: existingRecipe?.userEmail || currentUser.email,
          updatedAt: serverTimestamp()
        };

        if (!isEditing) {
          recipeObjToSave.createdAt = serverTimestamp();
          recipeObjToSave.rating = finalRating;
          recipeObjToSave.ratingsCount = 1;
        } else {
          recipeObjToSave.rating = existingRecipe?.rating || finalRating;
          recipeObjToSave.ratingsCount = existingRecipe?.ratingsCount || 1;
          if (existingRecipe?.createdAt) {
            recipeObjToSave.createdAt = existingRecipe.createdAt;
          }
        }

        try {
          await setDoc(doc(db, "recipes", savedRecipeId), recipeObjToSave);
          setSelectedRecipe(null);
        } catch (fbErr) {
          handleFirestoreError(fbErr, OperationType.WRITE, `recipes/${savedRecipeId}`);
        }
      } else {
        // Salvar local no localStorage para visitantes offline INSTANTANEAMENTE
        const localRecipeObj: Recipe = {
          id: savedRecipeId,
          title: newTitle.trim(),
          category: newCategoryToSave,
          description: finalDescription,
          prepTime: newPrepTime.trim(),
          portions: newPortions.trim().endsWith(" porções") ? newPortions.trim() : `${newPortions.trim()} porções`,
          ingredients: ingredientsArray,
          instructions: instructionsArray,
          isPreset: false,
          imageUrl: finalImageUrl,
          rating: isEditing && existingRecipe ? (existingRecipe.rating || 5) : finalRating,
          ratingsCount: isEditing && existingRecipe ? (existingRecipe.ratingsCount || 1) : 1,
          isPublic: newIsPublic,
          userEmail: existingRecipe?.userEmail || undefined,
          authorId: existingRecipe?.authorId || undefined,
          authorName: existingRecipe?.authorName || finalAuthorName
        };

        const savedCustom = localStorage.getItem("receitas_casa_custom");
        let currentCustomList: Recipe[] = [];
        if (savedCustom) {
          try {
            const parsed = JSON.parse(savedCustom);
            if (Array.isArray(parsed)) {
              currentCustomList = parsed;
            }
          } catch (errParse) {
            console.error("Erro ao fazer parse das receitas customizadas", errParse);
          }
        }
        
        let updatedCustomList: Recipe[] = [];
        if (isEditing) {
          updatedCustomList = currentCustomList.map(item => item.id === savedRecipeId ? localRecipeObj : item);
        } else {
          updatedCustomList = [localRecipeObj, ...currentCustomList];
        }
        
        try {
          localStorage.setItem("receitas_casa_custom", JSON.stringify(updatedCustomList));
        } catch (quotaError) {
          console.error("Erro de cota de armazenamento local", quotaError);
          if (newImageUrl) {
            setFormFeedback("A receita foi salva! Mas por ser uma foto muito pesada, guardamos ela usando a imagem padrão para poupar espaço.");
            const withoutImageObj = {
              ...localRecipeObj,
              imageUrl: fallbackImages[newCategoryToSave] || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600"
            };
            if (isEditing) {
              updatedCustomList = currentCustomList.map(item => item.id === savedRecipeId ? withoutImageObj : item);
            } else {
              updatedCustomList = [withoutImageObj, ...currentCustomList];
            }
            localStorage.setItem("receitas_casa_custom", JSON.stringify(updatedCustomList));
            localRecipeObj.imageUrl = withoutImageObj.imageUrl;
          } else {
            throw quotaError;
          }
        }

        setRecipes([...PRESET_RECIPES, ...updatedCustomList]);
        setSelectedRecipe(null);
      }

      // Limpar formulário
      setNewTitle("");
      setNewPrepTime("");
      setNewPortions("");
      setNewIngredientsText("");
      setNewInstructionsText("");
      setNewDescription("");
      setNewImageUrl("");
      setNewIsPublic(true);
      setNewRatingSetting(5);
      setFormFeedback(null);
      setEditingRecipeId(null);

      // Feedback de sucesso visual e ir direto para o caderno "Minhas Receitas"
      setActiveTab("minhas_receitas");
    } catch (errorSave: any) {
      console.error("Erro geral ao salvar receita", errorSave);
      setFormFeedback(`Desculpe! Ocorreu um problema ao guardar a receita: ${errorSave.message || errorSave}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- FILTRAR RECEITAS CATEGORIA E BUSCA ---
  const filteredRecipes = recipes.filter(recipe => {
    // Esconder receitas apagadas pelo usuário localmente ou removidas remotamente
    if (locallyDeletedIds.includes(recipe.id) || deletedPresetIds.includes(recipe.id)) {
      return false;
    }

    // Ocultar receitas privadas criadas por outros cozinheiros (de qualquer outro usuário ou visitante)
    const isAllowed = recipe.isPreset || recipe.isPublic !== false || isRecipeOwner(recipe);
    if (!isAllowed) return false;

    const matchesCategory = selectedCategory ? recipe.category === selectedCategory : true;
    const matchesSearch = searchQuery.trim() !== "" 
      ? recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  // Receitas Favoritas/Customizadas do usuário
  const mySavedRecipes = recipes.filter(recipe => {
    // Esconder receitas apagadas pelo usuário localmente ou removidas remotamente
    if (locallyDeletedIds.includes(recipe.id) || deletedPresetIds.includes(recipe.id)) {
      return false;
    }

    // Se for Preset do app, só aparece se foi adicionada aos favoritos pelo usuário
    if (recipe.isPreset) {
      return favorites.includes(recipe.id);
    }
    // Caso contrário, se for customizada (criada pelo próprio usuário no Firestore ou offline local)
    return isRecipeOwner(recipe);
  });

  // Classes dinâmicas de tamanho de fonte baseado em acessibilidade com Space Grotesk nos títulos
  const getFontSizeClass = (type: "titulo-principal" | "subtitulo" | "texto-normal" | "instrucao") => {
    if (fontSize === "grande") {
      switch (type) {
        case "titulo-principal": return "font-display text-2xl font-black tracking-tight";
        case "subtitulo": return "font-display text-xl font-black";
        case "texto-normal": return "font-sans text-lg leading-relaxed";
        case "instrucao": return "font-sans text-base italic text-[#3C3633]/80";
      }
    } else if (fontSize === "gigante") {
      switch (type) {
        case "titulo-principal": return "font-display text-3xl font-black tracking-tight";
        case "subtitulo": return "font-display text-2xl font-black";
        case "texto-normal": return "font-sans text-xl leading-relaxed font-bold";
        case "instrucao": return "font-sans text-lg italic text-[#3C3633]";
      }
    } else { // "mega"
      switch (type) {
        case "titulo-principal": return "font-display text-4xl font-black tracking-tight";
        case "subtitulo": return "font-display text-3xl font-black";
        case "texto-normal": return "font-sans text-2xl leading-loose font-extrabold";
        case "instrucao": return "font-sans text-xl font-bold italic text-[#3C3633]";
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] md:bg-[#FAF6EE] flex flex-col items-center justify-center py-0 md:py-6 px-0 md:px-4 font-sans text-[#3C3633] selection:bg-[#708238] selection:text-white">
      
      {/* HEADER DE SISTEMA - SIMULA EM BANNER FORA DO CELULAR (Visível apenas em computadores) */}
      <div className="hidden md:flex flex-col items-center mb-5 max-w-md text-center">
        <div className="bg-white border-4 border-[#3C3633] rounded-[24px] p-4 shadow-[6px_6px_0px_0px_rgba(60,54,51,1)] space-y-1">
          <h1 className="text-2xl font-display font-black text-[#708238] flex items-center justify-center gap-2 uppercase tracking-wide">
            <Sparkles className="text-[#708238] animate-pulse h-6 w-6 stroke-[3px]" /> 
            RECEITAS DA VOVÓ 
            <Sparkles className="text-[#708238] animate-pulse h-6 w-6 stroke-[3px]" />
          </h1>
          <p className="text-xs font-black text-[#3C3633]/85 uppercase tracking-wider">
            Acessibilidade Ativada • Bento Grid Theme
          </p>
        </div>
      </div>

      {/* RECEPTÁCULO DO DISPOSITIVO SMARTPHONE COM ESTILO BENTO GRID */}
      {/* No computador: vira um simulador de celular lindo. No smartphone real: se adapta para ocupar a tela cheia perfeitamente sem bordas extras ou rolagem dupla! */}
      <div id="device-frame" className="w-full md:max-w-md bg-[#FDFBF7] md:shadow-[12px_12px_0px_0px_rgba(60,54,51,1)] md:rounded-[40px] md:border-4 md:border-[#3C3633] overflow-hidden flex flex-col relative h-screen md:h-[760px] transition-all">
        
        {/* PARTE SUPERIOR DO CELULAR: ALTO-FALANTE E CÂMERA SIMULADOS (Apenas visível em computadores/telas maiores que simulam o frame) */}
        <div className="hidden md:flex w-full bg-[#708238] pb-2 justify-center items-center relative z-10 border-b-4 border-[#3C3633]">
          <div className="w-32 h-4 bg-[#56652B] rounded-b-xl flex items-center justify-center gap-2 border-b border-l border-r border-[#3C3633]">
            <div className="w-12 h-1 bg-white/40 rounded-full"></div>
            <div className="w-2 h-2 bg-white/40 rounded-full"></div>
          </div>
        </div>

        {/* CABEÇALHO DO APLICATIVO COM O NOME E FOTO DA VOVÓ */}
        <div className="bg-[#FAF6EE] px-4 py-3 flex items-center justify-between border-b-4 border-[#3C3633] gap-2 z-10 relative">
          <div className="flex items-center gap-2.5">
            <img 
              src={vovoAvatar} 
              alt="Vovó" 
              className="w-10 h-10 rounded-full border-2 border-[#3C3633] shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] object-cover bg-[#FFDE4D]"
              referrerPolicy="no-referrer"
            />
            <h2 className="text-lg font-display font-black text-[#3C3633] tracking-wider uppercase">
              Receitas da Vovó
            </h2>
          </div>

          {/* Botão de Conta do Usuário */}
          <button 
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#FFDE4D] border-2 border-[#3C3633] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-[#3C3633] shadow-[2.5px_2.5px_0px_0px_rgba(60,54,51,1)] hover:bg-[#FFD41A] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            title={currentUser ? `Logado como ${currentUser.name}` : "Entrar / Cadastrar"}
          >
            {currentUser ? (
              <span className="flex items-center gap-1">
                👤 {currentUser.isAdmin ? "Vovó Admin" : currentUser.name.split(" ")[0]}
              </span>
            ) : (
              <span className="flex items-center gap-1">🔑 Entrar</span>
            )}
          </button>
        </div>

        {/* --- CONTEÚDO PRINCIPAL (TELA ATIVA) --- */}
        <div 
          className={`flex-1 ${activeTab === "ver_receitas" && !selectedRecipe ? "overflow-hidden flex flex-col h-full" : "overflow-y-auto"} px-4 py-4 ${activeTab === "ver_receitas" && !selectedRecipe ? "pb-3" : "pb-32"} relative`} 
          style={{ scrollbarWidth: "thin" }}
        >
          
          {/* CASO HOUVER UMA RECEITA SELECIONADA, EXIBIR DETALHE ANTES DA TELA PADRÃO */}
          {selectedRecipe ? (
            <div className="space-y-5" id="recipe-details-screen">
              {/* Botão de Voltar gigante e confortável */}
              <button 
                id="btn-voltar-detalhe"
                onClick={() => {
                  if (window.history.state && window.history.state.selectedRecipeId === selectedRecipe?.id) {
                    window.history.back();
                  } else {
                    setSelectedRecipe(null);
                    setCurrentStepIndex(0);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 bg-white border-4 border-[#3C3633] hover:bg-[#F5F2ED] active:bg-[#3C3633] active:text-white py-3.5 px-4 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(60,54,51,1)] text-[#3C3633] font-black transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-lg"
              >
                <ArrowLeft className="h-7 w-7 stroke-[3px]" />
                <span>VOLTAR PARA A LISTA</span>
              </button>

              {/* Card da Receita */}
              <div className="bg-white border-4 border-[#3C3633] rounded-[32px] p-6 shadow-[6px_6px_0px_0px_rgba(60,54,51,1)] space-y-5">
                
                {/* Imagem salva da receita */}
                {selectedRecipe.imageUrl && (
                  <div className="w-full h-[220px] rounded-[24px] overflow-hidden border-4 border-[#3C3633] shadow-[4px_4px_0px_0px_rgba(60,54,51,1)] bg-[#FAF6EE] relative animate-fadeIn">
                    <img 
                      src={selectedRecipe.imageUrl} 
                      alt={selectedRecipe.title} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Opção de Publicar para todos ou Privar (Apenas se for receita do usuário) */}
                {!selectedRecipe.isPreset && isRecipeOwner(selectedRecipe) && (
                  <div className="bg-[#FAF6EE] border-4 border-[#3C3633] rounded-[24px] p-4.5 space-y-3.5 shadow-[4px_4px_0px_0px_rgba(60,54,51,1)] text-left animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl mt-0.5">
                        {selectedRecipe.isPublic !== false ? "🌍" : "🔒"}
                      </span>
                      <div>
                        <h4 className="font-display font-black text-sm text-[#3C3633] uppercase">
                          Privacidade da Receita
                        </h4>
                        <p className="text-[11px] text-gray-500 font-bold leading-tight">
                          {selectedRecipe.isPublic !== false 
                            ? "Status: Publicada para todos! Outras pessoas podem ver e cozinhar." 
                            : "Status: Privada. Salva apenas no seu caderno de receitas do aplicativo."}
                        </p>
                      </div>
                    </div>

                    {/* Alerta de feedback para a ação de privacidade e fotos */}
                    {recipeDetailFeedback && (
                      <div className="bg-white border-2 border-[#3C3633] rounded-xl p-2.5 text-[11px] font-black leading-tight text-[#3C3633] shadow-[2px_2px_0px_0px_rgba(60,54,51,1)]">
                        {recipeDetailFeedback}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedRecipe.isPublic !== false) {
                            handleTogglePrivacy(selectedRecipe.id);
                          }
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-xl border-2 text-[10px] font-black uppercase text-center cursor-pointer transition-all ${
                          selectedRecipe.isPublic === false 
                            ? "bg-[#FFEBE6] border-[#FFA3A3] text-red-800 ring-2 ring-red-200" 
                            : "bg-white border-[#3C3633] text-[#3C3633] hover:bg-gray-100"
                        }`}
                      >
                        🔒 DEIXAR PRIVADA
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedRecipe.isPublic !== false) {
                            // Já é público, não faz nada
                          } else {
                            handleTogglePrivacy(selectedRecipe.id);
                          }
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-xl border-2 text-[10px] font-black uppercase text-center cursor-pointer transition-all ${
                          selectedRecipe.isPublic !== false 
                            ? "bg-[#E6EDDF] border-[#708238] text-[#708238] ring-2 ring-green-100" 
                            : "bg-white border-[#3C3633] text-[#3C3633] hover:bg-gray-100"
                        }`}
                      >
                        🌍 PUBLICAR GERAL
                      </button>
                    </div>

                    {/* SEÇÃO: Adicionar ou Alterar Foto do Prato */}
                    <div className="border-t-2 border-dashed border-[#3C3633]/20 pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-extrabold text-[#3C3633] uppercase tracking-wider flex items-center gap-1">
                          📸 Foto Real do seu Prato
                        </label>
                        {selectedRecipe.imageUrl && selectedRecipe.imageUrl.startsWith("data:image/") ? (
                          <span className="text-[9px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-black uppercase">
                            ✓ Foto Carregada
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black uppercase">
                            ⚠️ Exclusivo para Pública
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[9.5px] text-gray-500 font-semibold leading-relaxed -mt-1">
                        Para poder deixar sua receita como <strong>Pública (🌍)</strong> para todos os usuários do app, você precisa adicionar uma foto real do prato preparado!
                      </p>

                      <div className="relative border-4 border-dashed border-[#3C3633] rounded-xl bg-white p-3 text-center cursor-pointer hover:border-[#708238] transition-all flex flex-col items-center justify-center min-h-[70px] active:scale-[0.99]">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleUpdateRecipePhoto(selectedRecipe.id, e)}
                          className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full"
                          title="Atualizar ou Adicionar Foto do Prato"
                        />
                        {selectedRecipe.imageUrl && selectedRecipe.imageUrl.startsWith("data:image/") ? (
                          <div className="flex items-center gap-2">
                            <div className="w-[50px] h-[35px] rounded border-2 border-[#3C3633] overflow-hidden shadow">
                              <img src={selectedRecipe.imageUrl} className="w-full h-full object-cover" alt="Foto atual" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-green-800 leading-none">ALTERAR FOTO REAL</p>
                              <p className="text-[8.5px] text-gray-400 font-bold">Toque para escolher outro arquivo</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[#3C3633]">
                            <Camera className="h-5 w-5 text-[#708238]" />
                            <div className="text-left">
                              <p className="text-[10px] font-black leading-none flex items-center justify-start gap-1">
                                ENVIAR A FOTO DO PRATO
                              </p>
                              <p className="text-[8.5px] text-gray-400 font-bold">Tirar foto pelo celular ou carregar galeria</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Título e botão de Favoritar */}
                <div className="flex justify-between items-start gap-2 border-b-4 border-[#F5F2ED] pb-4">
                  <div>
                    <span className="inline-block bg-[#708238]/10 text-[#708238] font-black text-xs px-3.5 py-1 rounded-xl border border-[#708238]/30 uppercase tracking-wider mb-2">
                      {selectedRecipe.category}
                    </span>
                    <h2 className={`${getFontSizeClass("titulo-principal")} text-[#3C3633]`}>
                      {selectedRecipe.title}
                    </h2>
                    <p className="text-xs font-bold text-[#708238] mt-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                      {selectedRecipe.isPreset ? (
                        <>💝 Receita Original do Aplicativo</>
                      ) : (
                        <>
                          🧑‍🍳 Criado por: <span className="font-black text-[#3C3633] underline decoration-[#708238]/40 decoration-2">{selectedRecipe.authorName || "Cozinheiro"}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <button 
                    id={`btn-fav-detail-${selectedRecipe.id}`}
                    onClick={() => handleToggleFavorite(selectedRecipe.id)}
                    className="p-3 bg-[#FDFBF7] rounded-full border-4 border-[#3C3633] active:scale-95 transition-transform shadow-[3px_3px_0px_0px_rgba(60,54,51,1)] cursor-pointer"
                    title={favorites.includes(selectedRecipe.id) ? "Remover de Favoritos" : "Favoritar Receita"}
                  >
                    <Heart 
                      className={`h-8 w-8 transition-colors ${favorites.includes(selectedRecipe.id) ? "fill-[#A0352A] stroke-[#2E1B10] stroke-[1px]" : "stroke-gray-400"}`} 
                    />
                  </button>
                </div>

                {/* Tempo e Rendimento */}
                <div className="grid grid-cols-2 gap-4 bg-[#F5F2ED] p-4 rounded-2xl border-2 border-[#3C3633]">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-[#708238] stroke-[3px]" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-black text-[#3C3633]/60 tracking-wider">Tempo</p>
                      <p className="text-sm font-black text-[#3C3633]">{selectedRecipe.prepTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-[#708238] stroke-[3px]" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-black text-[#3C3633]/60 tracking-wider">Rendimento</p>
                      <p className="text-sm font-black text-[#3C3633]">{selectedRecipe.portions}</p>
                    </div>
                  </div>
                </div>

                {/* AVALIE ESTE PRATO (Nota de Cozinheiro) */}
                <div className="bg-[#FAF6EE] border-4 border-[#3C3633] rounded-[24px] p-4.5 space-y-3 text-left shadow-[3px_3px_0px_0px_rgba(60,54,51,1)] animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h4 className="font-display font-black text-xs text-[#3C3633] uppercase tracking-wide flex items-center gap-1">
                        ⭐ Avaliar esta Receita
                      </h4>
                      
                      {/* O nome do autor (quem fez) */}
                      <p className="text-[10px] text-gray-500 font-bold leading-tight mt-1">
                        Prato de: <span className="text-[#3C3633] font-black">{selectedRecipe.isPreset ? "Vovó (Original)" : (selectedRecipe.authorName || "Cozinheiro")}</span>
                      </p>
                      
                      {/* Nota atual e contagem */}
                      <p className="text-[10px] text-gray-500 font-bold leading-tight mt-0.5">
                        Nota atual: <span className="text-[#708238] font-black">{Math.min(5, Number(selectedRecipe.rating || 5)).toFixed(1)} ⭐</span> ({selectedRecipe.ratingsCount || 1} {selectedRecipe.ratingsCount === 1 ? "voto" : "votos"})
                      </p>
                    </div>
                    
                    {/* Estrelas interativas com Hover e Seleção Alternável */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((starValue) => {
                        const userRating = userRatings[selectedRecipe.id];
                        // Se estiver passando o mouse, visualiza o hover; senão, mostra a nota do usuário; senão, mostra a média atual
                        const displayRating = hoveredStar !== null 
                          ? hoveredStar 
                          : (userRating !== undefined ? userRating : 0);
                        
                        const isStarred = starValue <= displayRating;
                        
                        return (
                          <button
                            key={starValue}
                            onClick={() => handleRateRecipe(selectedRecipe.id, starValue)}
                            onMouseEnter={() => setHoveredStar(starValue)}
                            onMouseLeave={() => setHoveredStar(null)}
                            className="p-1 rounded-lg transition-transform hover:scale-125 cursor-pointer active:scale-95"
                            title={`Avaliar com nota ${starValue}`}
                          >
                            <Star 
                              className={`h-6 w-6 transition-all duration-150 ${
                                isStarred 
                                  ? 'fill-amber-400 text-amber-500 scale-110 drop-shadow-[0_1.5px_3px_rgba(245,158,11,0.4)] opacity-100' 
                                  : 'text-gray-300 stroke-[#3C3633] stroke-[1px] opacity-25'
                              }`} 
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nome Cadastrado ou de quem está avaliando */}
                  <div className="border-t border-gray-200/60 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[10px] text-gray-400 font-bold">
                    <span>
                      Sua avaliação como: <strong className="text-[#708238]">{currentUser ? `${currentUser.name} 👤` : "Visitante (Sem Conta) 👤"}</strong>
                    </span>
                    {userRatings[selectedRecipe.id] !== undefined && (
                      <span className="text-[9px] bg-[#708238]/10 text-[#708238] py-0.5 px-2 rounded-lg font-black border border-[#708238]/20">
                        Sua nota dada: {userRatings[selectedRecipe.id]} Estrelas ⭐
                      </span>
                    )}
                  </div>
                  
                  {/* Mensagem dinâmica com possibilidade de alterar */}
                  {userRatings[selectedRecipe.id] !== undefined ? (
                    <p className="text-[9px] text-[#708238] font-black uppercase tracking-wider text-center bg-[#708238]/10 py-1.5 rounded-lg border border-[#708238]/20">
                      Sua avaliação foi registrada! Quer alterar? É só clicar em outra estrela 🍳💝
                    </p>
                  ) : (
                    <p className="text-[9px] text-gray-400 font-bold text-center">
                      Passe o mouse ou toque para escolher a nota e clique para confirmar!
                    </p>
                  )}
                </div>

                {/* SELETOR DE MODO DE VISUALIZAÇÃO - BENTO GRID ESTILO RÍGIDO */}
                <div className="border-t-2 border-b-2 border-gray-100 py-3.5 flex items-center justify-between gap-1">
                  <span className="text-xs font-black uppercase text-gray-500">Visualizar em:</span>
                  <div className="flex bg-[#F5F2ED] p-1.5 rounded-2xl gap-1 border-2 border-[#3C3633]">
                    <button 
                      id="btn-view-completa"
                      onClick={() => setRecipeViewMode("completa")}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${recipeViewMode === "completa" ? "bg-[#708238] text-white shadow-sm" : "text-[#3C3633]/60 hover:text-black"}`}
                    >
                      Completo
                    </button>
                    <button 
                      id="btn-view-passos"
                      onClick={() => {
                        setRecipeViewMode("passo-a-passo");
                        setCurrentStepIndex(0);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${recipeViewMode === "passo-a-passo" ? "bg-[#708238] text-white shadow-sm" : "text-[#3C3633]/60 hover:text-black"}`}
                    >
                      Passo a Passo
                    </button>
                  </div>
                </div>

                {/* CONTEÚDO BASEADO NO MODO DE VISUALIZAÇÃO */}
                {recipeViewMode === "completa" ? (
                  <div className="space-y-5">
                    {/* Lista de Ingredientes com Checklist Interativo */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-[#FDFBF7] border-2 border-[#3C3633] px-3.5 py-2 rounded-xl">
                        <h3 className={`${getFontSizeClass("subtitulo")} text-[#708238]`}>
                          Ingredientes
                        </h3>
                        <span className="text-xs font-bold text-[#3C3633]/60">Marque o que já pegou</span>
                      </div>
                      
                      <div className="space-y-2">
                        {selectedRecipe.ingredients.map((ing, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setCheckedIngredients({
                              ...checkedIngredients,
                              [idx]: !checkedIngredients[idx]
                            })}
                            className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${checkedIngredients[idx] ? "bg-gray-100 border-gray-300 text-gray-400" : "bg-white border-[#3C3633] hover:border-[#708238] shadow-[2px_2px_0px_0px_rgba(60,54,51,1)]"}`}
                          >
                            <div className={`mt-0.5 min-w-7 min-h-7 h-7 w-7 rounded-xl flex items-center justify-center transition-all border-2 ${checkedIngredients[idx] ? "bg-gray-400 border-gray-400 text-white" : "bg-[#FDFBF7] border-[#3C3633] text-[#708238]"}`}>
                              <Check className="h-5 w-5 stroke-[4px]" />
                            </div>
                            <span className={`${getFontSizeClass("texto-normal")} ${checkedIngredients[idx] ? "line-through text-gray-400 font-normal" : "text-[#3C3633] font-bold"}`}>
                              {ing}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Modo de fazer Completo */}
                    <div className="space-y-2">
                      <div className="bg-[#FDFBF7] border-2 border-[#3C3633] px-3.5 py-2 rounded-xl">
                        <h3 className={`${getFontSizeClass("subtitulo")} text-[#708238]`}>
                          Como Preparar
                        </h3>
                      </div>
                      <div className="space-y-4 pt-1">
                        {selectedRecipe.instructions.map((step, idx) => (
                          <div key={idx} className="flex gap-4 items-start p-4 bg-white border-2 border-[#3C3633] rounded-2xl shadow-[3px_3px_0px_0px_rgba(60,54,51,1)]">
                            <span className="min-w-10 min-h-10 rounded-xl bg-[#708238]/10 border-2 border-[#708238] font-black text-[#708238] flex items-center justify-center text-lg">
                              {idx + 1}
                            </span>
                            <p className={`${getFontSizeClass("texto-normal")} text-[#3C3633] text-left leading-relaxed font-bold`}>
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MODO DE VISUALIZAÇÃO INTERATIVO PASSO A PASSO (Vovó e Vovô friendly!) */
                  <div className="space-y-4" id="step-by-step-workflow">
                    <div className="bg-[#FDFBF7] border-2 border-[#3C3633] p-4 rounded-2xl text-center">
                      <span className="text-xs uppercase font-extrabold text-[#708238] tracking-widest">
                        Passo {currentStepIndex + 1} de {selectedRecipe.instructions.length}
                      </span>
                      <div className="w-full bg-[#3C3633]/15 h-3 rounded-full overflow-hidden mt-1.5 border border-[#3C3633]/20">
                        <div 
                          className="bg-[#708238] h-full transition-all duration-300" 
                          style={{ width: `${((currentStepIndex + 1) / selectedRecipe.instructions.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                     {/* Bloco Central do Passo em tamanho gigante */}
                    <div className="bg-white border-4 border-[#3C3633] p-10 rounded-[32px] shadow-[4px_4px_0px_0px_rgba(60,54,51,1)] min-h-[190px] flex flex-col justify-center items-center text-center">
                      
                      <p className={`${getFontSizeClass("texto-normal")} text-[#3C3633] text-center font-bold leading-relaxed`}>
                        {selectedRecipe.instructions[currentStepIndex]}
                      </p>
                    </div>

                    {/* Botões confortáveis de Avançar / Voltar o Passo */}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        id="btn-passo-anterior"
                        disabled={currentStepIndex === 0}
                        onClick={() => {
                          if (currentStepIndex > 0) {
                            setCurrentStepIndex(currentStepIndex - 1);
                          }
                        }}
                        className={`py-4 px-4 font-black rounded-2xl border-4 transition-all text-base flex justify-center items-center gap-1 ${currentStepIndex === 0 ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed shadow-none" : "bg-white text-[#3C3633] border-[#3C3633] shadow-[3px_3px_0px_0px_rgba(60,54,51,1)] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"}`}
                      >
                        ⬅ Voltar
                      </button>
                      <button
                        id="btn-proximo-passo"
                        onClick={() => {
                          if (currentStepIndex < selectedRecipe.instructions.length - 1) {
                            setCurrentStepIndex(currentStepIndex + 1);
                          } else {
                            // Fim dos passos! Voltar para a visualização completa
                            alert("Muito bem! Você completou todas as etapas desta receita de sucesso!");
                            setRecipeViewMode("completa");
                          }
                        }}
                        className="py-4 px-4 font-black rounded-2xl bg-[#708238] text-white hover:bg-[#5C6E2C] border-4 border-[#3C3633] shadow-[3px_3px_0px_0px_rgba(60,54,51,1)] transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-base flex justify-center items-center gap-1"
                      >
                        {currentStepIndex === selectedRecipe.instructions.length - 1 ? "Terminar 🎉" : "Próximo ➡"}
                      </button>
                    </div>
                  </div>
                )}

                {/* SEÇÃO DE COMENTÁRIOS COZINHA DA VOVÓ */}
                <div className="bg-white border-4 border-[#3C3633] rounded-[28px] p-5 shadow-[4px_4px_0px_0px_rgba(60,54,51,1)] space-y-4 text-left">
                  <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-2">
                    <span className="text-xl">💬</span>
                    <h3 className="font-display font-black text-base text-[#3C3633] uppercase">
                      Comentários ({comments[selectedRecipe.id]?.length || 0})
                    </h3>
                  </div>

                  {/* Lista de Comentários */}
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {(!comments[selectedRecipe.id] || comments[selectedRecipe.id].length === 0) ? (
                      <p className="text-gray-400 font-bold text-center py-4 text-xs">
                        Nenhum comentário ainda. Deixe um carinho para a vovó! 🌸
                      </p>
                    ) : (
                      comments[selectedRecipe.id].map((comment) => (
                        <div key={comment.id} className="p-3 bg-[#FAF6EE] border-2 border-[#3C3633] rounded-2xl relative shadow-[2px_2px_0px_0px_rgba(60,54,51,0.05)]">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-xs font-black text-[#708238] block leading-tight">
                                {comment.author} 
                                {comment.userEmail && <span className="text-[9px] text-gray-400 font-normal ml-1">({comment.userEmail})</span>}
                                {comment.userEmail === 'luizgustavo14102010@gmail.com' && (
                                  <span className="ml-1.5 bg-amber-100 text-amber-800 text-[9px] font-black px-1 py-0.5 rounded uppercase border border-amber-300">
                                    Vovó Admin ⭐
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] text-gray-400 font-semibold block mt-0.5">
                                {comment.timestamp}
                              </span>
                            </div>
                            
                            {/* Opção de Excluir Comentário (Admin, próprio autor logado ou se foi criado por este aparelho) */}
                            {(currentUser?.isAdmin || (currentUser && currentUser.email === comment.userEmail) || locallyCreatedCommentIds.includes(comment.id)) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(selectedRecipe.id, comment.id)}
                                className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 p-1.5 rounded-lg transition-all cursor-pointer"
                                title="Excluir Comentário"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs font-bold text-[#3C3633] mt-2 whitespace-pre-wrap leading-relaxed">
                            {comment.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Escrever novo comentário */}
                  <div className="space-y-3 pt-3 border-t-2 border-gray-100">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-[#3C3633]/70 uppercase tracking-wider block">
                        Deixe seu Recado:
                      </span>
                      {currentUser ? (
                        <div className="text-[10px] font-black text-gray-500 bg-[#FAF6EE] px-3 py-2 rounded-xl border border-dashed border-[#3C3633]/20 flex items-center gap-1">
                          <span>Comentando como: <strong className="text-[#708238]">{currentUser.name}</strong> ({currentUser.email})</span>
                        </div>
                      ) : (
                        <input 
                          type="text"
                          value={tempCommenterName}
                          onChange={(e) => setTempCommenterName(e.target.value)}
                          placeholder="Seu nome ou apelido (Ex: Maria)..."
                          maxLength={30}
                          className="w-full text-xs font-bold p-2.5 bg-white border-2 border-[#3C3633] rounded-[14px] focus:outline-none placeholder-gray-400 shadow-[2px_2px_0px_0px_rgba(60,54,51,0.05)]"
                        />
                      )}
                    </div>

                    <div className="relative">
                      <textarea
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        rows={2}
                        placeholder="Adicione um comentário carinhoso..."
                        maxLength={300}
                        className="w-full text-xs font-bold p-3 bg-white border-2 border-[#3C3633] rounded-[18px] focus:outline-none placeholder-gray-400 resize-none pr-12 shadow-[2px_2px_0px_0px_rgba(60,54,51,0.05)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveComment(selectedRecipe.id)}
                        className="absolute bottom-3 right-3 p-2 bg-[#708238] hover:bg-[#5C6E2C] text-white rounded-xl border-2 border-[#3C3633] shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] cursor-pointer active:scale-95 transition-all text-[10px] font-black uppercase"
                        title="Enviar Comentário"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Excluir / Editar Receita (se for do usuário ou administrador) */}
                {selectedRecipe && (
                  <div className="pt-3 border-t-2 border-[#F5F2ED] flex justify-between items-center gap-2">
                    {!selectedRecipe.isPreset && isRecipeOwner(selectedRecipe) && (
                      <button
                        id={`btn-edit-recipe-${selectedRecipe.id}`}
                        onClick={() => handleStartEditRecipe(selectedRecipe)}
                        className="py-2.5 px-4 bg-[#FFDE4D] border-2 border-[#3C3633] hover:bg-[#FFD41A] text-[#3C3633] rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-[2px_2px_0px_0px_rgba(60,54,51,1)]"
                      >
                        ✏️ EDITAR RECEITA
                      </button>
                    )}
                    <button
                      id={`btn-delete-recipe-${selectedRecipe.id}`}
                      onClick={(e) => handleDeleteCustomRecipe(selectedRecipe.id, e)}
                      className="py-2.5 px-4 bg-[#FFEBE6] border-2 border-[#FFA3A3] hover:bg-red-50 text-red-800 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      {selectedRecipe.isPreset ? "APAGAR RECEITA (FÁBRICA)" : "APAGAR ESTA RECEITA"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* --- NAVEGAÇÃO DE ABAS PADRÃO (TELA ATIVA NÃO RECEITA) --- */
            <div>
                {/* TELA 1: VER RECEITAS */}
              {activeTab === "ver_receitas" && (
                <div className="h-full flex flex-col overflow-hidden gap-3 justify-start" id="view-recipes-tab">
                  
                  {/* Input de Busca Grande e Fácil de Ler (Agora no Topo) */}
                  <div className="relative pt-1 shrink-0">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-6 w-6 text-[#3C3633] stroke-[3px]" />
                    </div>
                    <input 
                      id="search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nome (ex: bolo)..."
                      className="w-full pl-12 pr-11 py-3 bg-white border-4 border-[#3C3633] rounded-[24px] text-base font-extrabold focus:outline-none placeholder-gray-400 shadow-[4px_4px_0px_0px_rgba(60,54,51,0.15)]"
                    />
                    {searchQuery && (
                      <button 
                        id="btn-clear-search"
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-red-800 hover:text-black font-black text-sm"
                      >
                        LIMPAR
                      </button>
                    )}
                  </div>

                  {/* CARROSSEL DE RECEITAS (Filtrado se houver busca) */}
                  <div className="flex-1 min-h-0 flex flex-col justify-start gap-3 mt-4">
                    {filteredRecipes.length === 0 ? (
                      <div className="bg-white border-4 border-[#3C3633] p-5 rounded-[32px] text-center space-y-2 my-auto shadow-[4px_4px_0px_0px_rgba(60,54,51,1)]">
                        <p className="text-base text-[#3C3633] font-black uppercase font-display">Sem resultados</p>
                        <p className="text-xs text-gray-500 font-bold">Nenhuma receita encontrada para sua busca hoje!</p>
                        <button
                          onClick={() => setSearchQuery("")}
                          className="px-4 py-2 bg-[#708238] border-2 border-[#3C3633] text-white text-xs font-black rounded-xl shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] cursor-pointer"
                        >
                          Limpar Busca
                        </button>
                      </div>
                    ) : (
                      <div className="relative flex flex-col justify-start min-h-0 flex-1 gap-3">
                        {/* Carrossel Horizontal */}
                        <div 
                          ref={carouselRef}
                          onScroll={handleCarouselScroll}
                          className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 pt-1 scroll-smooth no-scrollbar"
                          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        >
                          {filteredRecipes.map((recipe) => (
                            <div
                              id={`recipe-card-home-${recipe.id}`}
                              key={recipe.id}
                              className="w-[270px] xs:w-[285px] shrink-0 snap-center bg-white border-4 border-[#3C3633] rounded-[32px] overflow-hidden shadow-[4px_4px_0px_0px_rgba(60,54,51,1)] flex flex-col relative hover:border-[#708238] transition-all recipe-carousel-card animate-fadeIn"
                            >
                              {/* Imagem Real do Criador ou Preset */}
                              <div className="relative h-[130px] w-full border-b-4 border-[#3C3633] bg-[#FAF6EE] overflow-hidden shrink-0">
                                <img 
                                  src={recipe.imageUrl || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600"} 
                                  alt={recipe.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                
                                {/* Nota de Avaliação (Estrelas da Vó) */}
                                <div className="absolute top-2 left-2 bg-white border-2 border-[#3C3633] px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] z-10">
                                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 stroke-[#3C3633] stroke-[1px]" />
                                  <span className="text-[11px] font-black text-[#3C3633]">{Math.min(5, Number(recipe.rating || 5)).toFixed(1)}</span>
                                </div>

                                {/* Botão de Coração */}
                                <button
                                  onClick={(e) => handleToggleFavorite(recipe.id, e)}
                                  className="absolute top-2 right-2 p-1.5 bg-white/95 rounded-full border-2 border-[#3C3633] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] z-10 cursor-pointer"
                                  title="Favoritar"
                                >
                                  <Heart 
                                    className={`h-4 w-4 transition-colors ${favorites.includes(recipe.id) ? "fill-[#A0352A] stroke-[#2E1B10] stroke-[1.5px]" : "stroke-gray-400"}`} 
                                  />
                                </button>

                                {!recipe.isPreset && (
                                  <span className="absolute bottom-1.5 right-1.5 bg-[#708238] border-2 border-[#3C3633] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(60,54,51,1)]">
                                    {isRecipeOwner(recipe) 
                                      ? `Minha ${recipe.isPublic !== false ? "🌍" : "🔒"}` 
                                      : `De: ${recipe.authorName || "Cozinheiro"} 🌍`}
                                  </span>
                                )}
                              </div>

                              {/* Corpo do Card com avaliação em destaque */}
                              <div className="p-3 flex-1 flex flex-col justify-between text-left space-y-1.5">
                                <div>
                                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#708238]">
                                    {recipe.category}
                                  </span>
                                  <h4 className="font-display text-base font-black text-[#3C3633] line-clamp-1 leading-tight">
                                    {recipe.title}
                                  </h4>
                                  <p className="text-[11px] text-gray-500 font-bold line-clamp-2 leading-relaxed mt-0.5">
                                    {recipe.description}
                                  </p>
                                </div>

                                <div className="pt-1.5 border-t border-[#F5F2ED] flex items-center justify-between">
                                  <div className="flex gap-2 text-xs font-bold text-gray-500">
                                    <span className="flex items-center gap-1 font-extrabold text-[#3C3633]/70">
                                      <Clock className="h-3.5 w-3.5 text-[#708238] stroke-[2px]" />
                                      {recipe.prepTime}
                                    </span>
                                  </div>
                                  
                                  <button
                                    onClick={() => setSelectedRecipe(recipe)}
                                    className="text-xs font-black text-white bg-[#708238] border-2 border-[#3C3633] px-3.5 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px] hover:bg-[#5C6E2C] transition-all cursor-pointer"
                                  >
                                    ABRIR ➡
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Setas e Controles para Idosos deslizarem com facilidade */}
                        <div className="flex justify-between items-center mt-2 px-1 shrink-0">
                          <button
                            onClick={() => scrollCarousel("left")}
                            className="px-3.5 py-2.5 bg-white hover:bg-[#F5F2ED] text-[#3C3633] text-xs font-black rounded-xl border-3 border-[#3C3633] shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
                          >
                            ⬅ VER ANTERIOR
                          </button>
                          
                          <button
                            onClick={() => scrollCarousel("right")}
                            className="px-3.5 py-2.5 bg-[#708238] hover:bg-[#5C6E2C] text-white text-xs font-black rounded-xl border-3 border-[#3C3633] shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
                          >
                            VER PRÓXIMA ➡
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TELA 2: CRIAR RECEITA */}
              {activeTab === "criar_receita" && (
                <div className="space-y-4" id="create-recipe-tab">
                  <div className="bg-[#708238]/10 border-4 border-[#708238] p-5 rounded-[28px] space-y-1.5 shadow-[4px_4px_0px_0px_rgba(112,130,56,0.15)] animate-fadeIn">
                    <span className="text-xs font-black uppercase bg-white text-[#708238] border border-[#708238] px-3 py-1 rounded-full inline-block">
                      {editingRecipeId ? "MODO DE EDIÇÃO ✏️" : "PASSO FÁCIL"}
                    </span>
                    <h2 className="text-[19px] font-display font-black text-[#3C3633] uppercase">
                      {editingRecipeId ? "Editar Receita de Família" : "Criar Receita de Família"}
                    </h2>
                    <p className="text-xs text-[#3C3633] font-bold leading-relaxed">
                      {editingRecipeId 
                        ? "Modifique os campos que você deseja atualizar. Quando terminar, basta clicar em salvar!" 
                        : "Preencha os campos abaixo com calma. Não se preocupe com erros, escreva do seu jeito!"}
                    </p>
                    {editingRecipeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRecipeId(null);
                          setNewTitle("");
                          setNewCategory("Bolos e Broas");
                          setNewPrepTime("");
                          setNewPortions("");
                          setNewIngredientsText("");
                          setNewInstructionsText("");
                          setNewDescription("");
                          setNewImageUrl("");
                          setActiveTab("minhas_receitas");
                        }}
                        className="mt-2 text-left px-3 py-1.5 bg-[#FFEBE6] border-2 border-[#FFA3A3] text-red-800 hover:bg-red-50 rounded-xl text-[10px] font-black flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                      >
                        ❌ CANCELAR EDIÇÃO E VOLTAR
                      </button>
                    )}
                  </div>

                  {formFeedback && (
                    <div className="bg-[#FFEBE6] border-4 border-[#3C3633] p-4 rounded-2xl text-red-800 text-xs font-black flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(60,54,51,1)]">
                      <span className="bg-red-800 text-white w-5 h-5 rounded-full flex items-center justify-center font-black">!</span>
                      <span>{formFeedback}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveRecipe} className="space-y-4">
                    
                    {/* Campo: Nome da Receita */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-black text-[#3C3633] block font-display tracking-wide uppercase" htmlFor="input-titulo">
                        1. Qual é o nome do seu prato?
                      </label>
                      <input 
                        id="input-titulo"
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ex: Torta de Maçã Simples da Maria"
                        className="w-full p-4 bg-white border-4 border-[#3C3633] rounded-2xl text-base font-extrabold shadow-[2px_2px_0px_0px_rgba(60,54,51,0.1)] focus:border-[#708238] transition-all"
                      />
                    </div>

                    {/* Campo Duplo: Tempo e Rendimento */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#3C3633] block font-display uppercase" htmlFor="input-tempo">
                          Tempo para fazer:
                        </label>
                        <input 
                          id="input-tempo"
                          type="text"
                          value={newPrepTime}
                          onChange={(e) => setNewPrepTime(e.target.value)}
                          placeholder="Ex: 40 minutos"
                          className="w-full p-3 bg-white border-4 border-[#3C3633] rounded-2xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(60,54,51,0.1)] focus:border-[#708238]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#3C3633] block font-display uppercase" htmlFor="input-rendimento">
                          Rendimento:
                        </label>
                        <div className="relative flex items-center">
                          <input 
                            id="input-rendimento"
                            type="number"
                            min="1"
                            value={newPortions}
                            onChange={(e) => setNewPortions(e.target.value)}
                            placeholder="Ex: 10"
                            className="w-full p-3 pr-20 bg-white border-4 border-[#3C3633] rounded-2xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(60,54,51,0.1)] focus:border-[#708238]"
                          />
                          <span className="absolute right-4 text-xs font-display font-black text-[#3C3633] bg-[#F5F2ED] border-2 border-[#3C3633] px-2 py-0.5 rounded-lg pointer-events-none">
                            porções
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Campo: Ingredientes */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-black text-[#3C3633] block font-display tracking-wide uppercase" htmlFor="input-ingredientes">
                        2. Quais são os ingredientes?
                      </label>
                      <p className="text-[11px] text-[#3C3633]/85 font-bold -mt-0.5 mb-1 bg-[#F5F2ED] p-2 rounded-xl border border-[#3C3633]/20">
                        💡 DICA: Coloque um em cada linha apertando "Enter" no seu teclado!
                      </p>
                      <textarea 
                        id="input-ingredientes"
                        rows={4}
                        value={newIngredientsText}
                        onChange={(e) => setNewIngredientsText(e.target.value)}
                        placeholder="Exemplo:&#10;3 xícaras de farinha&#10;1 xícara de açúcar&#10;3 ovos inteiros"
                        className="w-full p-4 bg-white border-4 border-[#3C3633] rounded-2xl text-base font-bold leading-relaxed focus:border-[#708238]"
                      />
                    </div>

                    {/* Campo: Instruções de Preparo */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-black text-[#3C3633] block font-display tracking-wide uppercase" htmlFor="input-instrucoes">
                        3. Como preparar o prato?
                      </label>
                      <p className="text-[11px] text-[#3C3633]/85 font-bold -mt-0.5 mb-1 bg-[#F5F2ED] p-2 rounded-xl border border-[#3C3633]/20">
                        💡 DICA: Divida o texto apertando "Enter" para criar passos fáceis!
                      </p>
                      <textarea 
                        id="input-instrucoes"
                        rows={4}
                        value={newInstructionsText}
                        onChange={(e) => setNewInstructionsText(e.target.value)}
                        placeholder="Exemplo:&#10;Misture todos os ingredientes no liquidificador.&#10;Asse em forno médio de 180 graus por 40 minutos."
                        className="w-full p-4 bg-white border-4 border-[#3C3633] rounded-2xl text-base font-bold leading-relaxed focus:border-[#708238]"
                      />
                    </div>

                    {/* Campo: Mensagem / Legenda Especial (Opcional) */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-black text-[#3C3633] block font-display tracking-wide uppercase" htmlFor="input-legenda">
                        3b. Quer colocar uma mensagem ou legenda especial? <span className="text-[10px] text-gray-500 font-bold lowercase italic">(Opcional)</span>
                      </label>
                      <p className="text-[11px] text-[#3C3633]/85 font-bold -mt-0.5 mb-1 bg-[#F5F2ED] p-2 rounded-xl border border-[#3C3633]/20">
                        ✍️ Se você não escrever nada, nós escolheremos uma linda mensagem surpresa com carinho de vó para o seu prato!
                      </p>
                      <textarea 
                        id="input-legenda"
                        rows={2}
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Escreva uma história gostosa do prato ou um recadinho especial (ex: Receita que aprendi com minha tia-avó no Natal)..."
                        className="w-full p-4 bg-white border-4 border-[#3C3633] rounded-2xl text-base font-bold leading-relaxed focus:border-[#708238]"
                      />
                    </div>

                    {/* Campo: Enviar Foto Real */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-black text-[#3C3633] block font-display tracking-wide uppercase flex justify-between items-center sm:flex-row flex-col gap-1">
                        <span>4. Adicione uma foto real do seu prato</span>
                        {newIsPublic && (
                          <span className="text-[9px] bg-[#A0352A] text-white px-2 py-0.5 rounded-md font-black uppercase tracking-wider animate-pulse">
                            Obrigatória para Pública
                          </span>
                        )}
                      </label>
                      <p className="text-[11px] text-[#3C3633]/85 font-bold -mt-0.5 mb-2 bg-[#F5F2ED] p-2 rounded-xl border border-[#3C3633]/20">
                        📸 Adicione uma linda foto do seu prato. Se marcar para publicar de forma Pública (🌍), de acordo com as regras da vovó cozinheira, a foto do prato é <strong>estritamente obrigatória</strong>!
                      </p>
                      
                      <div className="flex flex-col gap-3">
                        <div className="relative border-4 border-dashed border-[#3C3633] rounded-2xl bg-white p-4 text-center cursor-pointer hover:border-[#708238] transition-colors flex flex-col items-center justify-center min-h-[140px]">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full"
                            title="Escolher foto"
                          />
                          {newImageUrl ? (
                            <div className="space-y-2 w-full flex flex-col items-center">
                              <div className="w-[180px] h-[120px] rounded-xl overflow-hidden border-2 border-[#3C3633] shadow-inner relative">
                                <img src={newImageUrl} className="w-full h-full object-cover" alt="Sua foto nova" />
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setNewImageUrl(""); }}
                                  className="absolute top-1 right-1 bg-red-800 text-white border border-[#3C3633] rounded-lg px-2 py-0.5 text-[10px] font-black hover:bg-black uppercase cursor-pointer z-30"
                                >
                                  Remover
                                </button>
                              </div>
                              <p className="text-[10px] text-green-800 font-extrabold flex items-center gap-1">
                                <Check className="h-3 w-3 stroke-[3px]" /> FOTO CARREGADA E COMPRIMIDA COM SUCESSO!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 flex flex-col items-center">
                              <div className="p-3 bg-[#F5F2ED] rounded-xl border border-[#3C3633]">
                                <Camera className="h-6 w-6 text-[#708238]" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-[#3C3633]">SELECIONAR OU ENVIAR IMAGEM</p>
                                <p className="text-[10px] text-gray-400 font-bold">Funciona no computador e celular</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Campo: Publicar ou Privar */}
                    <div className="space-y-2 text-left bg-[#FAF6EE] border-4 border-[#3C3633] rounded-[24px] p-4.5 shadow-[2px_2px_0px_0px_rgba(60,54,51,0.1)]">
                      <label className="text-sm font-black text-[#3C3633] block font-display tracking-wide uppercase">
                        5. Onde salvar essa receita?
                      </label>
                      <p className="text-[11px] text-[#3C3633]/85 font-semibold -mt-0.5 mb-2 leading-relaxed">
                        🌎 <strong>Publicar para todos:</strong> Outras pessoas que usam o aplicativo poderão ver e fazer sua receita.
                        <br />
                        🔒 <strong>Privar no meu caderno:</strong> Guardado de forma segura apenas no seu caderno de receitas particular.
                      </p>

                      <div className="grid grid-cols-2 gap-3.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setNewIsPublic(false)}
                          className={`py-3 px-4 rounded-xl border-2 text-xs font-black uppercase text-center cursor-pointer transition-all ${
                            !newIsPublic
                              ? "bg-[#ABE0A3]/20 border-[#708238] text-[#708238] ring-4 ring-[#708238]/10"
                              : "bg-white border-[#3C3633] text-[#3C3633]"
                          }`}
                        >
                          🔒 SÓ NO CADERNO
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setNewIsPublic(true)}
                          className={`py-3 px-4 rounded-xl border-2 text-xs font-black uppercase text-center cursor-pointer transition-all ${
                            newIsPublic
                              ? "bg-[#ABE0A3]/20 border-[#708238] text-[#708238] ring-4 ring-[#708238]/10"
                              : "bg-white border-[#3C3633] text-[#3C3633]"
                          }`}
                        >
                          🌎 PUBLICAR PARA TODOS
                        </button>
                      </div>

                      <div className="mt-3.5 pt-3 border-t-2 border-[#3C3633]/15 text-left">
                        <p className="text-[11px] text-[#3C3633]/90 font-bold flex items-center gap-1.5">
                          👤 Receita criada por: <strong className="text-[#708238] uppercase tracking-wider">{currentUser ? currentUser.name : "Cozinheiro Visitante"}</strong>
                        </p>
                        <p className="text-[9.5px] text-[#3C3633]/70 font-semibold leading-tight mt-0.5">
                          (Identificação associada de forma segura diretamente à sua conta ativa)
                        </p>
                      </div>
                    </div>

                    {/* Botão de Enviar gigante */}
                    {formFeedback && (
                      <div className="bg-[#FFEBE6] border-4 border-[#3C3633] p-4 rounded-2xl text-red-800 text-xs font-black flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(60,54,51,1)] animate-fadeIn">
                        <span className="bg-red-800 text-white w-5 h-5 rounded-full flex items-center justify-center font-black">!</span>
                        <span>{formFeedback}</span>
                      </div>
                    )}

                    <button 
                      id="btn-submeter"
                      type="submit"
                      disabled={isSaving}
                      className={`w-full py-4 text-white text-lg font-black rounded-2xl border-4 border-[#3C3633] transition-all flex items-center justify-center gap-2 uppercase tracking-wide font-display ${
                        isSaving 
                          ? "bg-gray-400 cursor-not-allowed shadow-none" 
                          : "bg-[#708238] hover:bg-[#5C6E2C] active:bg-[#3C3633] shadow-[4px_4px_0px_0px_rgba(60,54,51,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Guardando sua receita...</span>
                        </>
                      ) : (
                        <span>💾 GUARDAR RECEITA COM AMOR</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TELA 3: MEU CADERNO / MINHAS RECEITAS */}
              {activeTab === "minhas_receitas" && (
                <div className="space-y-4" id="my-recipes-tab">
                  {/* Banner superior */}
                  <div className="bg-[#F5F2ED] border-4 border-[#3C3633] p-5 rounded-[28px] text-center space-y-2 shadow-[4px_4px_0px_0px_rgba(60,54,51,1)]">
                    <span className="text-xs font-black uppercase bg-[#708238] text-white border-2 border-[#3C3633] px-3.5 py-1 rounded-full inline-block shadow-[2px_2px_0px_0px_rgba(60,54,51,1)]">
                      Meu Estojo Particular
                    </span>
                    <h2 className="text-xl font-display font-black text-[#3C3633]">
                      Meu Caderno Favorito
                    </h2>
                    <p className="text-xs text-[#3C3633] font-bold leading-relaxed">
                      Aqui ficam salvas as receitas que você escreveu e as do aplicativo que você marcou com coração!
                    </p>
                  </div>

                  {mySavedRecipes.length === 0 ? (
                    /* Caderno vazio com instruções com setas confortáveis */
                    <div className="bg-white border-4 border-dashed border-[#3C3633] p-8 rounded-[32px] text-center space-y-4" id="empty-notebook-directions">
                      <div className="w-16 h-16 bg-[#F5F2ED] rounded-xl flex items-center justify-center mx-auto border-2 border-[#3C3633] shadow-[3px_3px_0px_0px_rgba(60,54,51,1)]">
                        <BookMarked className="h-8 w-8 text-[#708238]" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base text-[#3C3633] font-black uppercase font-display">
                          Seu Caderno está limpo!
                        </p>
                        <p className="text-xs text-gray-500 font-bold leading-relaxed max-w-xs mx-auto">
                          Dica fácil: Escreva e guarde sua primeira receita clicando no botão circular de Criar Receita.
                        </p>
                      </div>
                      
                      {/* Seta animada visual apontando para baixo para ajudar idosos no visual */}
                      <div className="text-[#708238] flex flex-col items-center animate-bounce pt-2">
                        <span className="text-[10px] font-black tracking-widest uppercase mb-1">Toque aqui embaixo</span>
                        <span className="text-2xl">👇</span>
                      </div>
                    </div>
                  ) : (
                    /* Lista de Favoritos e Customizados */
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider">
                        Tenho {mySavedRecipes.length} receita(s) guardadas:
                      </h4>
                      
                      <div className="space-y-4">
                        {mySavedRecipes.map((recipe) => (
                          <div
                            id={`my-recipe-card-${recipe.id}`}
                            key={recipe.id}
                            onClick={() => setSelectedRecipe(recipe)}
                            className="w-full bg-white border-4 border-[#3C3633] p-5 rounded-[28px] hover:border-[#708238] cursor-pointer shadow-[4px_4px_0px_0px_rgba(60,54,51,1)] flex flex-col relative overflow-hidden animate-none"
                          >
                            {/* Badges de Destaque */}
                            {(!recipe.isPreset && isRecipeOwner(recipe)) ? (
                              <span className="absolute top-0 right-0 bg-[#C18C5D] text-white text-[9px] font-black px-3.5 py-1 rounded-bl-xl uppercase tracking-wider border-l border-b border-[#3C3633]/30">
                                Criação Minha
                              </span>
                            ) : (
                              <span className="absolute top-0 right-0 bg-[#A0352A] text-white text-[9px] font-black px-3.5 py-1 rounded-bl-xl uppercase tracking-wider border-l border-b border-[#3C3633]/30">
                                Favorita ❤️ {(!recipe.isPreset && recipe.authorName) ? `(por: ${recipe.authorName})` : ''}
                              </span>
                            )}

                            <div>
                              <span className="text-[10px] bg-[#F5F2ED] border-2 border-[#3C3633] text-[#3C3633] font-black px-2.5 py-1 rounded-lg uppercase inline-block">
                                {recipe.category}
                              </span>
                              {!recipe.isPreset && (
                                <span className={`text-[10px] ml-1.5 border-2 border-[#3C3633] font-black px-2 py-1 rounded-lg uppercase inline-block ${recipe.isPublic !== false ? 'bg-[#E6EDDF] text-[#708238]' : 'bg-[#FFEBE6] text-red-800'}`}>
                                  {recipe.isPublic !== false ? "🌍 Pública" : "🔒 Privada"}
                                </span>
                              )}
                              <h4 className="text-lg font-display font-black text-[#3C3633] mt-2 line-clamp-1">
                                {recipe.title}
                              </h4>
                            </div>

                            <p className="text-xs text-gray-500 font-bold mt-1.5 line-clamp-2 leading-relaxed">
                              {recipe.description}
                            </p>

                            <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-[#F5F2ED]">
                              <div className="flex gap-3 text-xs text-gray-500 font-bold">
                                <span className="flex items-center gap-1 font-black">
                                  <Clock className="h-4 w-4 text-[#708238] stroke-[2.5px]" />
                                  {recipe.prepTime}
                                </span>
                              </div>
                              
                              <div className="flex gap-1.5 items-center">
                                {/* Botão para editar diretamente caso seja dono da receita */}
                                {(!recipe.isPreset && isRecipeOwner(recipe)) && (
                                  <button
                                    id={`btn-inline-edit-${recipe.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditRecipe(recipe);
                                    }}
                                    className="py-1 px-2.5 bg-[#FFDE4D] border-2 border-[#3C3633] text-[#3C3633] hover:bg-[#FFD41A] rounded-lg cursor-pointer text-[10px] font-black flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-[1px_1px_0px_0px_rgba(60,54,51,1)] shrink-0 h-7"
                                    title="Editar Receita"
                                  >
                                    ✏️
                                    <span>Editar</span>
                                  </button>
                                )}

                                {/* Botão para deletar/remover diretamente */}
                                <button
                                  id={`btn-inline-delete-${recipe.id}`}
                                  onClick={(e) => handleDeleteCustomRecipe(recipe.id, e)}
                                  className="py-1 px-2 bg-[#FFEBE6] border-2 border-[#FFA3A3] text-red-800 hover:bg-red-50 rounded-lg cursor-pointer text-[10px] font-black flex items-center justify-center gap-1 active:scale-95 transition-transform shrink-0 h-7"
                                  title="Remover do Caderno"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-600 shrink-0" />
                                  <span>Apagar</span>
                                </button>
                                <span className="text-xs font-black text-white bg-[#708238] border-2 border-[#3C3633] px-3.5 py-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(60,54,51,1)]">
                                  ABRIR
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* --- BARRA DE NAVEGAÇÃO INFERIOR FIXA (BOTTOM BAR) --- */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t-4 border-[#708238] py-2 px-8 flex justify-between items-center z-20 h-[105px]">
          
          {/* Lado Esquerdo: Ver Receitas */}
          <button 
            id="nav-btn-ver-receitas"
            onClick={() => {
              setActiveTab("ver_receitas");
              setSelectedRecipe(null);
              setSelectedCategory(null);
            }}
            className="flex flex-col items-center justify-center w-20 h-16 active:scale-95 transition-transform cursor-pointer"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${activeTab === "ver_receitas" ? "bg-[#708238]/15 border-[#708238] shadow-[2px_2px_0px_0px_rgba(112,130,56,1)]" : "bg-[#3C3633]/5 border-[#3c3633]/30 opacity-60"}`}>
              <BookOpen className={`h-6 w-6 stroke-[3px] ${activeTab === "ver_receitas" ? "text-[#708238]" : "text-[#3C3633]"}`} />
            </div>
            <span className={`text-[11px] font-black mt-1 uppercase tracking-wider ${activeTab === "ver_receitas" ? "text-[#708238]" : "text-[#3C3633]/60"}`}>
              Receitas
            </span>
          </button>

          {/* Centro: O BOTÃO REDONDO DESTAQUE "Criar Receita" */}
          {/* Fica ressaltado de forma icônica, com texto claro e bordas Bento */}
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-6 flex flex-col items-center">
            <button 
              id="nav-btn-criar"
              onClick={() => {
                setActiveTab("criar_receita");
                setSelectedRecipe(null);
                setSelectedCategory(null);
                setFormFeedback(null);
                if (editingRecipeId) {
                  setEditingRecipeId(null);
                  setNewTitle("");
                  setNewCategory("Bolos e Broas");
                  setNewPrepTime("");
                  setNewPortions("");
                  setNewIngredientsText("");
                  setNewInstructionsText("");
                  setNewDescription("");
                  setNewImageUrl("");
                }
              }}
              className="w-[72px] h-[72px] rounded-full bg-[#708238] border-3 border-[#FDFBF7] shadow-xl hover:bg-[#5C6E2C] active:scale-90 transition-transform flex flex-col items-center justify-center text-white ring-4 ring-[#708238] cursor-pointer"
              title="Adicionar ou Escrever Nova Receita"
            >
              <Plus className="h-7 w-7 stroke-[4.5px]" />
              <span className="text-[10px] font-black text-white leading-tight uppercase tracking-wider">
                Criar
              </span>
            </button>
            <span className="mt-1 text-[11px] font-black uppercase text-[#708238] tracking-widest leading-none">
              CRIAR RECEITA
            </span>
          </div>

          {/* Spacer virtual no grid para compensar o botão central absoluto */}
          <div className="w-16"></div>

          {/* Lado Direito: Favoritos / Caderno */}
          <button 
            id="nav-btn-minhas"
            onClick={() => {
              setActiveTab("minhas_receitas");
              setSelectedRecipe(null);
              setSelectedCategory(null);
            }}
            className="flex flex-col items-center justify-center w-20 h-16 active:scale-95 transition-transform cursor-pointer"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all relative ${activeTab === "minhas_receitas" ? "bg-[#708238]/15 border-[#708238] shadow-[2px_2px_0px_0px_rgba(112,130,56,1)]" : "bg-[#3C3633]/5 border-[#3c3633]/30 opacity-60"}`}>
              <Heart className={`h-6 w-6 stroke-[3px] ${activeTab === "minhas_receitas" ? "text-red-700" : "text-[#3C3633]"}`} />
            </div>
            <span className={`text-[11px] font-black mt-1 uppercase tracking-wider ${activeTab === "minhas_receitas" ? "text-[#708238]" : "text-[#3C3633]/60"}`}>
              Caderno
            </span>
          </button>

        </div>

      </div>

      {recipeToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-[#3C3633] rounded-[32px] max-w-sm w-full p-6 text-center space-y-4 shadow-[8px_8px_0px_0px_rgba(60,54,51,1)] animate-fadeIn">
            <div className="w-16 h-16 bg-[#FFEBE6] border-4 border-[#3C3633] rounded-full flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>
            
            <div className="space-y-2">
              <h3 className="font-display font-black text-lg text-[#3C3633] uppercase">
                {recipes.find(r => r.id === recipeToDelete)?.isPreset ? "Apagar de Fábrica?" : "Confirmar Exclusão?"}
              </h3>
              <p className="text-sm text-gray-600 font-bold leading-relaxed font-sans">
                {recipes.find(r => r.id === recipeToDelete)?.isPreset 
                  ? "Você tem certeza de que deseja apagar essa receita de fábrica? Ela não será mais exibida no seu aplicativo imediatamente." 
                  : "Você deseja apagar essa receita do seu aplicativo? Ela será removida da sua visão imediatamente de forma definitiva."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setRecipeToDelete(null)}
                className="py-3 px-4 bg-[#F5F2ED] border-4 border-[#3C3633] hover:bg-[#E8E6E1] text-[#3C3633] rounded-2xl text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] active:scale-95 transition-all cursor-pointer"
              >
                Não, voltar
              </button>
              <button
                onClick={() => {
                  if (recipeToDelete) {
                    confirmDeleteRecipe(recipeToDelete);
                    setRecipeToDelete(null);
                  }
                }}
                className="py-3 px-4 bg-[#A0352A] hover:bg-[#8D2D23] text-white border-4 border-[#3C3633] rounded-2xl text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(60,54,51,1)] active:scale-95 transition-all cursor-pointer"
              >
                Sim, apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#FDFBF7] border-4 border-[#3C3633] rounded-[36px] max-w-sm w-full p-6 space-y-4 shadow-[10px_10px_0px_0px_rgba(60,54,51,1)] text-center relative max-h-[90vh] overflow-y-auto">
            
            {/* Fechar modal */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black font-black text-lg p-1.5 focus:outline-none transition-transform active:scale-90"
              title="Fechar"
            >
              ✕
            </button>

            {currentUser ? (
              showAdminSystemPanel && currentUser.isAdmin ? (
                // Painel de Controle Administrativo (Exclusivo Luiz Gustavo)
                <div className="space-y-4 pt-2 text-left animate-fadeIn">
                  <div className="flex items-center justify-between border-b-2 border-[#3C3633]/25 pb-2">
                    <h3 className="font-display font-black text-base text-[#3C3633] uppercase flex items-center gap-1.5">
                      <span>👑 Painel do Aplicativo</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAdminSystemPanel(false)}
                      className="py-1 px-3 bg-[#F5F2ED] border-2 border-[#3C3633] rounded-xl text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_rgba(60,54,51,1)] cursor-pointer active:scale-95 transition-all"
                    >
                      Voltar ↩️
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
                    Aqui você pode gerenciar os acessos de cozinheiros cadastrados na base do aplicativo:
                  </p>

                  {loadingCookingUsers ? (
                    <div className="py-8 text-center text-xs font-black text-gray-500 animate-pulse">
                      Carregando cozinheiros do banco... ⚙️
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-[#708238]/15 border-2 border-[#708238] rounded-2xl p-3 text-center shadow-[2px_2px_0px_0px_rgba(60,54,51,1)]">
                        <span className="text-[9px] font-black uppercase text-[#708238] block tracking-wider">
                          Total de Cozinheiros Cadastrados
                        </span>
                        <span className="text-2xl font-black text-[#3C3633] block mt-0.5">
                          {cookingUsers.length} Pessoas 🍳
                        </span>
                      </div>

                      <div className="border-4 border-[#3C3633] rounded-[24px] bg-white p-2.5 shadow-[4px_4px_0px_0px_rgba(60,54,51,1)] max-h-[220px] overflow-y-auto space-y-2" style={{ scrollbarWidth: "thin" }}>
                        {cookingUsers.length === 0 ? (
                          <p className="text-[10px] font-black text-gray-400 text-center py-4 uppercase">
                            Nenhum cozinheiro registrado ainda.
                          </p>
                        ) : (
                          cookingUsers.map((u, idx) => (
                            <div key={idx} className="border-2 border-[#3C3633]/20 rounded-xl p-2.5 bg-[#FDFBF7] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-[#708238] uppercase truncate max-w-[125px]">
                                  🧑‍🍳 {u.name || "Cozinheiro"}
                                </span>
                                {u.isAdmin && (
                                  <span className="bg-[#FFDE4D] text-[#3C3633] border border-[#3C3633] text-[8px] font-black px-1 rounded uppercase">
                                    Admin ⭐
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#3C3633] font-bold break-all">
                                📧 E-mail: <strong className="select-all text-xs font-mono">{u.email}</strong>
                              </p>
                              <p className="text-[10px] text-red-800 font-bold break-all">
                                🔑 Senha: <strong className="bg-[#FFEBE6] text-[#A0352A] px-1.5 py-0.5 border border-red-200 rounded text-xs select-all font-mono">{u.password || "Sem Senha"}</strong>
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      loadCookingUsers();
                    }}
                    className="w-full py-2 bg-[#708238] hover:bg-[#5C6E2C] text-white border-2 border-[#3C3633] rounded-xl text-[10px] font-black uppercase shadow-[2.5px_2.5px_0px_0px_rgba(60,54,51,1)] cursor-pointer text-center"
                  >
                    Atualizar Base de Dados 🔄
                  </button>
                </div>
              ) : (
                // Modo Logado Padrão
                <div className="space-y-4 pt-2">
                  <div className="w-20 h-20 bg-[#FFDE4D] border-3 border-[#3C3633] rounded-full flex items-center justify-center mx-auto text-4xl shadow-[3px_3px_0px_0px_rgba(60,54,51,1)]">
                    {currentUser.isAdmin ? "👑" : "🍳"}
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-xl text-[#3C3633] uppercase">
                      Seu Perfil
                    </h3>
                    <div className="bg-[#708238]/10 border-2 border-[#708238]/20 rounded-2xl p-3.5 space-y-1 text-left">
                      <p className="text-sm font-black text-[#708238]">
                        Nome: {currentUser.name}
                      </p>
                      <p className="text-xs font-bold text-gray-500">
                        E-mail: {currentUser.email}
                      </p>
                      {currentUser.isAdmin && (
                        <span className="inline-block bg-[#FFDE4D] text-[#3C3633] border border-[#3C3633] font-black text-[9px] px-2 py-0.5 rounded-md uppercase mt-1">
                          Conta Administrador ⭐
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-bold text-gray-500 leading-relaxed text-left">
                    {currentUser.isAdmin 
                      ? "Logado como administrador Luiz Gustavo. Você possui permissão para apagar receitas públicas compartilhadas e excluir comentários indesejados." 
                      : "Suas novas receitas criadas serão marcadas com o seu e-mail!"}
                  </p>

                  {currentUser.isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminSystemPanel(true);
                        loadCookingUsers();
                      }}
                      className="w-full py-2.5 bg-[#FFDE4D] hover:bg-[#FFD41A] text-[#3C3633] border-2 border-[#3C3633] rounded-2xl text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_rgba(60,54,51,1)] cursor-pointer active:scale-95 transition-all mt-1"
                    >
                      Ver Informações do App 👑
                    </button>
                  )}

                  <div className="space-y-2 pt-1 border-t-2 border-[#F5F2ED]">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full py-3 bg-[#A0352A] hover:bg-[#8D2D23] text-white border-2 border-[#3C3633] shadow-[3px_3px_0px_0px_rgba(60,54,51,1)] rounded-2xl text-xs font-black uppercase active:scale-95 transition-all cursor-pointer"
                    >
                      Sair da minha Conta 👋
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(false)}
                      className="w-full py-2.5 bg-[#F5F2ED] border-2 border-[#3C3633] hover:bg-[#E8E6E1] text-[#3C3633] rounded-2xl text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(60,54,51,1)] active:scale-95 transition-all cursor-pointer"
                    >
                      Voltar para as receitas
                    </button>
                  </div>
                </div>
              )
            ) : (
              // Formulário de Cadastro / Login
              <div className="space-y-4 pt-2">
                <div className="w-16 h-16 bg-[#FFDE4D] border-3 border-[#3C3633] rounded-full flex items-center justify-center mx-auto text-3xl shadow-[3px_3px_0px_0px_rgba(60,54,51,1)]">
                  🍳
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-black text-lg text-[#3C3633] uppercase">
                    Caderno de Receitas da Família
                  </h3>
                  <p className="text-xs text-gray-500 font-bold leading-relaxed max-w-xs mx-auto">
                    {authMode === "login" 
                      ? "Acesse seu caderno com seu e-mail de acesso e senha!" 
                      : "Crie sua conta rapidinho com e-mail e escolha uma senha!"}
                  </p>
                </div>

                {/* Alternador de abas interna no modal */}
                <div className="grid grid-cols-2 bg-[#F5F2ED] border-2 border-[#3C3633] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setAuthMode("login"); setAuthFeedback(null); }}
                    className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${authMode === "login" ? "bg-[#708238] text-white" : "text-[#3C3633]/60"}`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode("register"); setAuthFeedback(null); }}
                    className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${authMode === "register" ? "bg-[#708238] text-white" : "text-[#3C3633]/60"}`}
                  >
                    Criar Conta
                  </button>
                </div>

                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-left space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
                    📱 100% COMPATÍVEL COM ANDROID & CELULAR
                  </span>
                  <p className="text-[10px] text-[#3C3633] font-bold leading-normal">
                    {authMode === "login"
                      ? "Se você já criou a sua conta anteriormente, basta preencher seu e-mail cadastrado e a sua senha de acesso abaixo!"
                      : "Digite seu e-mail principal e escolha uma senha de 6 dígitos. Funciona perfeitamente em qualquer celular!"}
                  </p>
                  <p className="text-[9px] text-[#708238] font-black uppercase pt-1">
                    ⭐ Conecte-se para salvar e gerenciar suas receitas preferidas!
                  </p>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-left">
                  {authMode === "register" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#3C3633] uppercase tracking-wide block">
                        Seu Nome ou Apelido:
                      </label>
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Ex: Luiz Gustavo"
                        className="w-full text-xs font-bold p-2.5 bg-white border-2 border-[#3C3633] rounded-xl focus:outline-none placeholder-gray-400 font-sans"
                        maxLength={40}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#3C3633] uppercase tracking-wide block">
                      E-mail de Cadastro:
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="exemplo@gmail.com"
                      className="w-full text-xs font-bold p-2.5 bg-white border-2 border-[#3C3633] rounded-xl focus:outline-none placeholder-gray-400 font-sans"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#3C3633] uppercase tracking-wide block">
                      Senha de Acesso (Crie uma senha de 6 números ou letras):
                    </label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Digite sua senha..."
                      className="w-full text-xs font-bold p-2.5 bg-white border-2 border-[#3C3633] rounded-xl focus:outline-none placeholder-gray-400 font-sans"
                      required
                    />
                  </div>

                  {authFeedback && (
                    <div className="bg-[#FFEBE6] border-2 border-red-300 rounded-xl p-2.5 text-[11px] font-bold text-red-800 text-center uppercase tracking-wide leading-tight">
                      ⚠️ {authFeedback}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#708238] hover:bg-[#5C6E2C] text-white border-2 border-[#3C3633] rounded-2xl text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(60,54,51,1)] cursor-pointer active:scale-95 transition-transform"
                    >
                      {authMode === "login" ? "Confirmar e Entrar 🔑" : "Cadastrar Conta com Sucesso 🍳"}
                    </button>
                  </div>
                </form>

                <div className="pt-2 border-t border-dashed border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(false)}
                    className="w-full py-2 bg-transparent text-[#708238] hover:text-[#5C6E2C] text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Continuar como Visitante ➔
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
