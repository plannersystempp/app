import { useState, useEffect, useCallback, RefObject } from 'react';

interface ScrollNavigationState {
  showScrollToTop: boolean;
}

/**
 * Monitora a posição de scroll de um elemento HTML específico.
 * @param scrollContainerRef A Ref para o elemento de contêiner que possui a barra de rolagem.
 */
export const useScrollNavigation = (scrollContainerRef: RefObject<HTMLElement>) => {
  const [state, setState] = useState<ScrollNavigationState>({
    showScrollToTop: false,
  });

  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      // Se o container não existe, esconde os botões
      setState({ showScrollToTop: false });
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isScrollable = scrollHeight > clientHeight + 5; // Margem de 5px

    if (!isScrollable) {
      setState({ showScrollToTop: false });
      return;
    }

    const isNearTop = scrollTop <= 50;
    
    setState({
      showScrollToTop: !isNearTop,
    });
  }, [scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Um pequeno atraso para a primeira verificação garante que o DOM esteja pronto
    const initialCheckTimeout = setTimeout(checkScrollPosition, 150);
    
    container.addEventListener('scroll', checkScrollPosition, { passive: true });
    window.addEventListener('resize', checkScrollPosition, { passive: true });

    // Um observer para detectar mudanças de conteúdo (itens adicionados/removidos)
    const observer = new MutationObserver(checkScrollPosition);
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    return () => {
      clearTimeout(initialCheckTimeout);
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
      observer.disconnect();
    };
  }, [scrollContainerRef, checkScrollPosition]);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [scrollContainerRef]);

  return { ...state, scrollToTop };
};