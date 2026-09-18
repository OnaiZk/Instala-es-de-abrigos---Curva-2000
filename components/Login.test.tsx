import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import { supabase } from '../api/supabaseClient';

describe('Login Component', () => {
    const mockOnLoginSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders login form with forgot password button by default', () => {
        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        expect(screen.getByRole('heading', { name: /Acesso/i })).toBeInTheDocument();
        expect(screen.getByText(/Insira suas credenciais/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/usuario@eletromidia.com.br/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Esqueceu a senha\?/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Entrar$/i })).toBeInTheDocument();
    });

    it('navigates to forgot password form when clicking "Esqueceu a senha?"', () => {
        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        const forgotBtn = screen.getByRole('button', { name: /Esqueceu a senha\?/i });
        fireEvent.click(forgotBtn);

        expect(screen.getByRole('heading', { name: /Recuperar Senha/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Enviar Instruções/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Voltar ao login/i })).toBeInTheDocument();
    });

    it('returns to login form when clicking "Voltar ao login" from forgot password', () => {
        render(<Login onLoginSuccess={mockOnLoginSuccess} />);
        const forgotBtn = screen.getByRole('button', { name: /Esqueceu a senha\?/i });
        fireEvent.click(forgotBtn);

        const backBtn = screen.getByRole('button', { name: /Voltar ao login/i });
        fireEvent.click(backBtn);

        expect(screen.getByRole('heading', { name: /Acesso/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Entrar$/i })).toBeInTheDocument();
    });

    it('renders password reset form directly when initialMode is reset', () => {
        render(<Login onLoginSuccess={mockOnLoginSuccess} initialMode="reset" />);
        expect(screen.getByRole('heading', { name: /Nova Senha/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Mínimo 6 caracteres/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Repita a nova senha/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Salvar Nova Senha/i })).toBeInTheDocument();
    });
});

