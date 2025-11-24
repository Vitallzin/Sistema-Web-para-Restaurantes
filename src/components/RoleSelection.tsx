import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { UserCog, Users, ChefHat, CreditCard, LogOut } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface RoleSelectionProps {
  restaurantId: string;
  restaurantName: string;
  onSelectRole: (role: string) => void;
  onLogout: () => void;
}

export function RoleSelection({ restaurantId, restaurantName, onSelectRole, onLogout }: RoleSelectionProps) {
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [managerPassword, setManagerPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleManagerClick = () => {
    setShowManagerDialog(true);
    setError('');
  };

  const handleSetPassword = async () => {
    if (!newPassword) {
      setError('Digite uma senha');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/set-manager-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            restaurantId,
            password: newPassword,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao definir senha');
      }

      setShowSetPasswordDialog(false);
      setShowManagerDialog(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyManager = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/verify-manager`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            restaurantId,
            password: managerPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Senha incorreta');
        }
        throw new Error(data.error || 'Verificação falhou');
      }

      onSelectRole('manager');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'waiter',
      title: 'Garçom',
      description: 'Gerenciar mesas e pedidos',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      id: 'cashier',
      title: 'Caixa',
      description: 'Fechar contas e gerenciar pedidos',
      icon: CreditCard,
      color: 'bg-green-500',
    },
    {
      id: 'kitchen',
      title: 'Cozinha',
      description: 'Ver e preparar pedidos',
      icon: ChefHat,
      color: 'bg-orange-500',
    },
    {
      id: 'manager',
      title: 'Gerente/Dono',
      description: 'Relatórios e configurações',
      icon: UserCog,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-red-50">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl mb-2">{restaurantName}</h1>
          <p className="text-gray-600">Selecione sua função no sistema</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="mt-4"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <Card
              key={role.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                if (role.id === 'manager') {
                  handleManagerClick();
                } else {
                  onSelectRole(role.id);
                }
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`${role.color} p-3 rounded-full`}>
                    <role.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>{role.title}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showManagerDialog} onOpenChange={setShowManagerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso de Gerente</DialogTitle>
            <DialogDescription>
              Digite a senha de gerente para continuar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manager-password">Senha de Gerente</Label>
              <Input
                id="manager-password"
                type="password"
                placeholder="••••••••"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyManager()}
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleVerifyManager} disabled={loading} className="flex-1">
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowManagerDialog(false);
                  setShowSetPasswordDialog(true);
                }}
              >
                Definir Senha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSetPasswordDialog} onOpenChange={setShowSetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Senha de Gerente</DialogTitle>
            <DialogDescription>
              Configure a senha de acesso ao painel de gerente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
            <Button onClick={handleSetPassword} disabled={loading} className="w-full">
              {loading ? 'Salvando...' : 'Salvar Senha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
