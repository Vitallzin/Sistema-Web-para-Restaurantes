import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Plus, Trash2, Package, BarChart3, UtensilsCrossed } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ManagerViewProps {
  restaurantId: string;
  restaurantName: string;
  onBack: () => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  ingredients?: { name: string; quantity: number; unit: string }[];
}

interface InventoryItem {
  ingredient: string;
  quantity: number;
  unit: string;
}

interface SalesData {
  date: string;
  total: number;
  count: number;
}

export function ManagerView({ restaurantId, restaurantName, onBack }: ManagerViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<SalesData[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  
  // Product form
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('food');
  const [productIngredients, setProductIngredients] = useState<{ name: string; quantity: string; unit: string }[]>([]);

  // Inventory form
  const [inventoryIngredient, setInventoryIngredient] = useState('');
  const [inventoryQuantity, setInventoryQuantity] = useState('');
  const [inventoryUnit, setInventoryUnit] = useState('g');

  useEffect(() => {
    loadProducts();
    loadInventory();
    loadSales();
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

  const loadInventory = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/inventory/${restaurantId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setInventory(data.inventory || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const loadSales = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/sales/${restaurantId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setSales((data.sales || []).sort((a: SalesData, b: SalesData) => 
        b.date.localeCompare(a.date)
      ));
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  const addProduct = async () => {
    if (!productName || !productPrice) {
      alert('Preencha nome e preço do produto');
      return;
    }

    try {
      const ingredients = productIngredients
        .filter(ing => ing.name && ing.quantity)
        .map(ing => ({
          name: ing.name,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
        }));

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            restaurantId,
            name: productName,
            price: parseFloat(productPrice),
            category: productCategory,
            ingredients,
          }),
        }
      );

      setProductName('');
      setProductPrice('');
      setProductCategory('food');
      setProductIngredients([]);
      setShowProductDialog(false);
      loadProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Erro ao adicionar produto');
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/products/${productId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ restaurantId }),
        }
      );

      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const addInventory = async () => {
    if (!inventoryIngredient || !inventoryQuantity) {
      alert('Preencha ingrediente e quantidade');
      return;
    }

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e0724fe2/inventory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            restaurantId,
            ingredient: inventoryIngredient,
            quantity: parseFloat(inventoryQuantity),
            unit: inventoryUnit,
          }),
        }
      );

      setInventoryIngredient('');
      setInventoryQuantity('');
      setInventoryUnit('g');
      setShowInventoryDialog(false);
      loadInventory();
    } catch (error) {
      console.error('Error adding inventory:', error);
      alert('Erro ao adicionar estoque');
    }
  };

  const addIngredientField = () => {
    setProductIngredients([...productIngredients, { name: '', quantity: '', unit: 'g' }]);
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...productIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setProductIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setProductIngredients(productIngredients.filter((_, i) => i !== index));
  };

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalOrders = sales.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-600 text-white p-4 shadow">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-purple-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl">Gerente</h1>
            <p className="text-sm text-purple-100">{restaurantName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="sales">
              <BarChart3 className="w-4 h-4 mr-2" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="products">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <Package className="w-4 h-4 mr-2" />
              Estoque
            </TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Total de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl text-green-600">
                    R$ {totalSales.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Total de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl text-blue-600">{totalOrders}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-600">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl text-purple-600">
                    R$ {totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0.00'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vendas por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                {sales.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhuma venda registrada ainda
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sales.map((sale) => (
                      <div
                        key={sale.date}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded"
                      >
                        <div>
                          <p>{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                          <p className="text-sm text-gray-600">{sale.count} pedidos</p>
                        </div>
                        <p className="text-green-600">
                          R$ {sale.total.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Produtos do Cardápio</CardTitle>
                  <Button onClick={() => setShowProductDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum produto cadastrado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded"
                      >
                        <div className="flex-1">
                          <p>{product.name}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-green-600">
                              R$ {product.price.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-600">
                              {product.category === 'food' ? 'Comida' : 'Bebida'}
                            </span>
                            {product.ingredients && product.ingredients.length > 0 && (
                              <span className="text-xs text-gray-500">
                                {product.ingredients.length} ingredientes
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProduct(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Controle de Estoque</CardTitle>
                  <Button onClick={() => setShowInventoryDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar ao Estoque
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {inventory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum item em estoque
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {inventory.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded border-2 ${
                          item.quantity < 100
                            ? 'border-red-300 bg-red-50'
                            : item.quantity < 500
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-green-300 bg-green-50'
                        }`}
                      >
                        <p className="mb-1">{item.ingredient}</p>
                        <p className="text-xl">
                          {item.quantity} {item.unit}
                        </p>
                        {item.quantity < 100 && (
                          <p className="text-xs text-red-600 mt-1">Estoque baixo!</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Nome do Produto</Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Pizza de Calabresa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-price">Preço (R$)</Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-category">Categoria</Label>
                <select
                  id="product-category"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300"
                >
                  <option value="food">Comida</option>
                  <option value="drink">Bebida</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ingredientes (opcional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addIngredientField}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Ingrediente
                </Button>
              </div>

              {productIngredients.map((ingredient, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="Nome do ingrediente"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qtd"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                    className="w-24"
                  />
                  <select
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    className="w-20 px-2 rounded-md border border-gray-300"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="un">un</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredient(idx)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addProduct}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Inventory Dialog */}
      <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar ao Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inventory-ingredient">Ingrediente</Label>
              <Input
                id="inventory-ingredient"
                value={inventoryIngredient}
                onChange={(e) => setInventoryIngredient(e.target.value)}
                placeholder="Ex: Farinha de Trigo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inventory-quantity">Quantidade</Label>
                <Input
                  id="inventory-quantity"
                  type="number"
                  value={inventoryQuantity}
                  onChange={(e) => setInventoryQuantity(e.target.value)}
                  placeholder="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-unit">Unidade</Label>
                <select
                  id="inventory-unit"
                  value={inventoryUnit}
                  onChange={(e) => setInventoryUnit(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300"
                >
                  <option value="g">Gramas (g)</option>
                  <option value="kg">Quilos (kg)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="L">Litros (L)</option>
                  <option value="un">Unidades (un)</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInventoryDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addInventory}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
