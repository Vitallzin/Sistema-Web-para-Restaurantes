import { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { RoleSelection } from './components/RoleSelection';
import { WaiterView } from './components/WaiterView';
import { CashierView } from './components/CashierView';
import { KitchenView } from './components/KitchenView';
import { ManagerView } from './components/ManagerView';

export default function App() {
  const [screen, setScreen] = useState<'login' | 'role-selection' | 'waiter' | 'cashier' | 'kitchen' | 'manager'>('login');
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>('');

  const handleLogin = (id: string, name: string) => {
    setRestaurantId(id);
    setRestaurantName(name);
    setScreen('role-selection');
  };

  const handleRoleSelection = (role: string) => {
    setScreen(role as any);
  };

  const handleLogout = () => {
    setRestaurantId('');
    setRestaurantName('');
    setScreen('login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {screen === 'login' && (
        <LoginScreen onLogin={handleLogin} />
      )}
      {screen === 'role-selection' && (
        <RoleSelection 
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onSelectRole={handleRoleSelection}
          onLogout={handleLogout}
        />
      )}
      {screen === 'waiter' && (
        <WaiterView 
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onBack={() => setScreen('role-selection')}
        />
      )}
      {screen === 'cashier' && (
        <CashierView 
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onBack={() => setScreen('role-selection')}
        />
      )}
      {screen === 'kitchen' && (
        <KitchenView 
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onBack={() => setScreen('role-selection')}
        />
      )}
      {screen === 'manager' && (
        <ManagerView 
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onBack={() => setScreen('role-selection')}
        />
      )}
    </div>
  );
}
