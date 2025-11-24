import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Check, Clock } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface KitchenViewProps {
  restaurantId: string;
  restaurantName: string;
  onBack: () => void;
}

interface Order {
  id: string;
  tableNumber: number;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    category: string;
  }[];
  status: string;
  timestamp: number;
}

export function KitchenView({ restaurantId, restaurantName, onBack }: KitchenViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/kitchen-orders/${restaurantId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setOrders((data.orders || []).sort((a: Order, b: Order) => a.timestamp - b.timestamp));
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
    }
  };

  const markAsReady = async (orderId: string) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/orders/${orderId}/ready`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ restaurantId }),
        }
      );

      loadOrders();
    } catch (error) {
      console.error('Error marking order as ready:', error);
    }
  };

  const getTimeElapsed = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Agora';
    return `${minutes}min atrás`;
  };

  const foodOrders = orders.filter(order =>
    order.items.some(item => item.category === 'food')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-600 text-white p-4 shadow sticky top-0 z-10">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-orange-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl">Cozinha</h1>
            <p className="text-sm text-orange-100">{restaurantName}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-orange-700 px-4 py-2 rounded">
            <Clock className="w-5 h-5" />
            <span className="text-lg">{foodOrders.length} Pedidos</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {foodOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-gray-100 p-6 rounded-full">
                  <Check className="w-12 h-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg mb-2">Nenhum pedido pendente</h3>
                  <p className="text-gray-600">
                    Novos pedidos aparecerão aqui automaticamente
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {foodOrders.map((order) => (
              <Card
                key={order.id}
                className={`${
                  order.status === 'ready'
                    ? 'border-green-500 bg-green-50'
                    : 'border-orange-500'
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      Mesa {order.tableNumber === 0 ? 'Delivery' : order.tableNumber}
                    </span>
                    <span className="text-sm text-gray-600">
                      {getTimeElapsed(order.timestamp)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items
                      .filter(item => item.category === 'food')
                      .map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded border">
                          <div className="bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            {item.quantity}
                          </div>
                          <div className="flex-1">
                            <p>{item.name}</p>
                          </div>
                        </div>
                      ))}

                    {order.status === 'pending' ? (
                      <Button
                        onClick={() => markAsReady(order.id)}
                        className="w-full bg-green-600 hover:bg-green-700 mt-3"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Marcar como Pronto
                      </Button>
                    ) : (
                      <div className="bg-green-100 text-green-700 p-3 rounded text-center mt-3">
                        <Check className="w-5 h-5 inline-block mr-2" />
                        Pedido Pronto
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
