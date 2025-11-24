import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Trash2, Plus, Minus, Receipt, Check } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CashierViewProps {
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

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export function CashierView({ restaurantId, restaurantName, onBack }: CashierViewProps) {
  const [tables, setTables] = useState<{ [key: number]: Order[] }>({});
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryCart, setDeliveryCart] = useState<{ product: Product; quantity: number }[]>([]);

  useEffect(() => {
    loadTables();
    loadProducts();
    loadReadyOrders();
    const interval = setInterval(() => {
      loadTables();
      loadReadyOrders();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadTables = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/tables/${restaurantId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      
      // Group orders by table
      const tableOrders: { [key: number]: Order[] } = {};
      
      for (const table of data.tables) {
        const ordersResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/tables/${restaurantId}/${table.number}/orders`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        const ordersData = await ordersResponse.json();
        tableOrders[table.number] = ordersData.orders || [];
      }

      setTables(tableOrders);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

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

  const loadReadyOrders = async () => {
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
      setReadyOrders((data.orders || []).filter((o: Order) => o.status === 'ready'));
    } catch (error) {
      console.error('Error loading ready orders:', error);
    }
  };

  const updateItemQuantity = async (orderId: string, itemIndex: number, quantity: number) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/orders/${orderId}/items`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            restaurantId,
            itemIndex,
            quantity,
          }),
        }
      );

      loadTables();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const completeReadyOrder = async (orderId: string) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/orders/${orderId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ restaurantId }),
        }
      );

      loadReadyOrders();
      loadTables();
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const closeTable = async (tableNumber: number, subtotal: number) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/tables/${restaurantId}/${tableNumber}/close`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ subtotal }),
        }
      );

      setShowCheckoutDialog(false);
      setSelectedTable(null);
      loadTables();
    } catch (error) {
      console.error('Error closing table:', error);
    }
  };

  const submitDeliveryOrder = async () => {
    if (deliveryCart.length === 0) return;

    try {
      const items = deliveryCart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        category: item.product.category,
      }));

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            restaurantId,
            tableNumber: 0, // Delivery orders use table 0
            items,
          }),
        }
      );

      setDeliveryCart([]);
      setShowDeliveryDialog(false);
      alert('Pedido de delivery enviado para a cozinha!');
    } catch (error) {
      console.error('Error submitting delivery order:', error);
    }
  };

  const getTableTotal = (tableNumber: number) => {
    const orders = tables[tableNumber] || [];
    return orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0);
  };

  const handleCheckout = (tableNumber: number) => {
    setSelectedTable(tableNumber);
    setShowCheckoutDialog(true);
  };

  const printBill = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 shadow print:hidden">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-green-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Caixa</h1>
              <p className="text-sm text-green-100">{restaurantName}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowDeliveryDialog(true)}
            className="bg-white text-green-600 hover:bg-green-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Pedido Delivery
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Ready Orders from Kitchen */}
        {readyOrders.length > 0 && (
          <Card className="mb-6 print:hidden">
            <CardHeader>
              <CardTitle className="text-green-600">Pedidos Prontos da Cozinha</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {readyOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                    <div>
                      <p>Mesa {order.tableNumber}</p>
                      <p className="text-sm text-gray-600">
                        {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => completeReadyOrder(order.id)}
                      className="bg-green-600"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Concluir
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((tableNumber) => {
            const orders = tables[tableNumber] || [];
            const total = getTableTotal(tableNumber);
            const hasOrders = orders.length > 0;

            return (
              <Card key={tableNumber} className={hasOrders ? 'border-green-500' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Mesa {tableNumber}</span>
                    {hasOrders && (
                      <span className="text-green-600">
                        R$ {total.toFixed(2)}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!hasOrders ? (
                    <p className="text-gray-500 text-sm">Vazia</p>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div key={order.id} className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="flex-1">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(order.id, idx, item.quantity - 1)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-6 text-center">{item.quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(order.id, idx, item.quantity + 1)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateItemQuantity(order.id, idx, 0)}
                                  className="h-6 w-6 p-0 text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      <Button
                        onClick={() => handleCheckout(tableNumber)}
                        className="w-full mt-3"
                        size="sm"
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Fechar Mesa
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fechar Mesa {selectedTable}</DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              <div className="space-y-2">
                {(tables[selectedTable] || []).map((order) =>
                  order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {getTableTotal(selectedTable).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Taxa de Serviço (10%):</span>
                  <span>R$ {(getTableTotal(selectedTable) * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Total:</span>
                  <span>R$ {(getTableTotal(selectedTable) * 1.1).toFixed(2)}</span>
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={printBill}
                  className="flex-1"
                >
                  Imprimir Conta
                </Button>
                <Button
                  onClick={() => closeTable(selectedTable, getTableTotal(selectedTable))}
                  className="flex-1"
                >
                  Dar Baixa
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido de Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {products.filter(p => p.category === 'food').map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <p className="text-sm">{product.name}</p>
                    <p className="text-xs text-gray-600">R$ {product.price.toFixed(2)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const existing = deliveryCart.find(item => item.product.id === product.id);
                      if (existing) {
                        setDeliveryCart(deliveryCart.map(item =>
                          item.product.id === product.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                        ));
                      } else {
                        setDeliveryCart([...deliveryCart, { product, quantity: 1 }]);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {deliveryCart.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm">Itens selecionados:</p>
                {deliveryCart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between text-sm">
                    <span>{item.product.name}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const updated = deliveryCart.map(i =>
                            i.product.id === item.product.id && i.quantity > 1
                              ? { ...i, quantity: i.quantity - 1 }
                              : i
                          ).filter(i => i.quantity > 0);
                          setDeliveryCart(updated);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDeliveryCart(deliveryCart.map(i =>
                            i.product.id === item.product.id
                              ? { ...i, quantity: i.quantity + 1 }
                              : i
                          ));
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={submitDeliveryOrder}
                  className="w-full mt-4"
                >
                  Enviar para Cozinha
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
