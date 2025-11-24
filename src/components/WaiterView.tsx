import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface WaiterViewProps {
  restaurantId: string;
  restaurantName: string;
  onBack: () => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export function WaiterView({ restaurantId, restaurantName, onBack }: WaiterViewProps) {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/products/${restaurantId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const existing = cart.find(item => item.product.id === productId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.product.id !== productId));
    }
  };

  const submitOrder = async () => {
    if (!selectedTable || cart.length === 0) return;

    setLoading(true);
    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        category: item.product.category,
      }));

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            restaurantId,
            tableNumber: selectedTable,
            items,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao enviar pedido');
      }

      setCart([]);
      setSelectedTable(null);
      alert('Pedido enviado com sucesso!');
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Erro ao enviar pedido');
    } finally {
      setLoading(false);
    }
  };

  const tables = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-blue-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl">Garçom</h1>
            <p className="text-sm text-blue-100">{restaurantName}</p>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="p-4">
        <h2 className="text-lg mb-4">Selecione a Mesa</h2>
        <div className="grid grid-cols-3 gap-3">
          {tables.map((tableNumber) => (
            <button
              key={tableNumber}
              onClick={() => setSelectedTable(tableNumber)}
              className={`aspect-square rounded-lg border-2 flex items-center justify-center text-xl transition-all ${
                selectedTable === tableNumber
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              }`}
            >
              Mesa {tableNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      {selectedTable && (
        <div className="p-4">
          <h2 className="text-lg mb-4">Adicionar Itens - Mesa {selectedTable}</h2>
          <div className="space-y-2">
            {products.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-gray-500">
                  Nenhum produto cadastrado. Peça ao gerente para adicionar produtos.
                </CardContent>
              </Card>
            ) : (
              products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{product.name}</p>
                        <p className="text-sm text-gray-600">
                          R$ {product.price.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        className="shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-3 max-h-32 overflow-y-auto space-y-2">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between text-sm">
                  <span className="flex-1 truncate">{item.product.name}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFromCart(item.product.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addToCart(item.product)}
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={submitOrder}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Enviando...' : `Enviar Pedido - Mesa ${selectedTable}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
