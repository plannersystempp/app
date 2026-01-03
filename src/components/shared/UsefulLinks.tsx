import React from 'react'
import { Link } from 'react-router-dom'

export interface UsefulLinksProps {
  className?: string
}

export function UsefulLinks({ className }: UsefulLinksProps) {
  return (
    <div className={className ?? 'space-y-4 sm:space-y-4'}>
      <h4 className="text-base sm:text-lg font-bold">Links Úteis</h4>
      <div className="space-y-3 sm:space-y-3">
        <Link to="/plans" className="block text-sm sm:text-base text-muted-foreground hover:text-primary transition-colors">
          Planos e Preços
        </Link>
        <Link to="/quem-somos" className="block text-sm sm:text-base text-muted-foreground hover:text-primary transition-colors">
          Quem Somos
        </Link>
        <Link to="/auth" className="block text-sm sm:text-base text-muted-foreground hover:text-primary transition-colors">
          Fazer Login
        </Link>
      </div>
    </div>
  )
}

