'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  Upload,
  ImageIcon,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Bot,
  BarChart3,
  FileCode,
  Package,
} from 'lucide-react';

interface EaProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  version: string | null;
  platform: string | null;
  category: string | null;
  features: string | null;
  productType: string | null;
  imageUrl: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  status: string | null;
  salesCount: number | null;
  createdAt: Date | null;
}

const PRODUCT_TYPES = [
  { value: 'ea', label: 'EA智能交易', icon: Bot, color: 'bg-purple-500' },
  { value: 'indicator', label: '技术指标', icon: BarChart3, color: 'bg-blue-500' },
  { value: 'script', label: '脚本工具', icon: FileCode, color: 'bg-amber-500' },
  { value: 'tool', label: '交易工具', icon: Package, color: 'bg-green-500' },
];

const PLATFORMS = [
  { value: 'MT4', label: 'MT4' },
  { value: 'MT5', label: 'MT5' },
  { value: 'Both', label: 'MT4/MT5' },
];

const CATEGORIES = ['趋势', '震荡', '马丁', '剥头皮', '网格', '其他'];

export default function UserEaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadProductIdRef = useRef<number | null>(null);
  const uploadImageProductIdRef = useRef<number | null>(null);

  const [products, setProducts] = useState<EaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 表单状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EaProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '0',
    version: '1.0.0',
    platform: 'Both',
    category: '',
    features: '',
    productType: 'ea',
    imageUrl: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 认证检查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/user/ea');
    }
  }, [status, router]);

  // 获取用户的产品列表
  useEffect(() => {
    if (session) {
      fetchUserProducts();
    }
  }, [session]);

  const fetchUserProducts = async () => {
    try {
      const res = await fetch('/api/ea/my-products');
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
      } else {
        setError(data.error || '获取产品列表失败');
      }
    } catch (err) {
      setError('获取产品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };

  // 打开新增对话框
  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '0',
      version: '1.0.0',
      platform: 'Both',
      category: '',
      features: '',
      productType: 'ea',
      imageUrl: '',
    });
    setImagePreview(null);
    setDialogOpen(true);
  };

  // 编辑产品
  const handleEdit = (product: EaProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      version: product.version || '1.0.0',
      platform: product.platform || 'Both',
      category: product.category || '',
      features: product.features ? JSON.parse(product.features).join('\n') : '',
      productType: product.productType || 'ea',
      imageUrl: product.imageUrl || '',
    });
    setImagePreview(product.imageUrl || null);
    setDialogOpen(true);
  };

  // 保存产品
  const handleSave = async () => {
    if (!formData.name) {
      showError('请填写产品名称');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const features = formData.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f);

      const res = await fetch('/api/ea/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseInt(formData.price) || 0,
          version: formData.version,
          platform: formData.platform,
          category: formData.category,
          productType: formData.productType,
          features: JSON.stringify(features),
          imageUrl: formData.imageUrl,
          productId: editingProduct?.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showSuccess(editingProduct ? '产品更新成功！' : '产品创建成功！');
        setDialogOpen(false);
        fetchUserProducts();
      } else {
        showError(data.error || '保存失败');
      }
    } catch (err) {
      showError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除产品
  const handleDelete = async (productId: number) => {
    if (!confirm('确定要删除这个产品吗？')) return;

    try {
      const res = await fetch(`/api/ea/manage?productId=${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showSuccess('产品删除成功！');
        fetchUserProducts();
      } else {
        const data = await res.json();
        showError(data.error || '删除失败');
      }
    } catch (err) {
      showError('删除失败');
    }
  };

  // 切换产品状态（上架/下架）
  const toggleStatus = async (product: EaProduct) => {
    try {
      const res = await fetch('/api/ea/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          status: product.status === 'active' ? 'inactive' : 'active',
        }),
      });

      if (res.ok) {
        showSuccess(product.status === 'active' ? '产品已下架' : '产品已上架');
        fetchUserProducts();
      } else {
        showError('操作失败');
      }
    } catch (err) {
      showError('操作失败');
    }
  };

  // 选择文件上传
  const handleFileSelect = (productId: number) => {
    uploadProductIdRef.current = productId;
    fileInputRef.current?.click();
  };

  // 选择图片上传
  const handleImageSelect = (productId: number) => {
    uploadImageProductIdRef.current = productId;
    imageInputRef.current?.click();
  };

  // 上传 EA 文件
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = uploadProductIdRef.current;

    if (!file || !productId) return;

    setUploading(productId);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', productId.toString());

      const res = await fetch('/api/ea/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        showSuccess('文件上传成功！');
        fetchUserProducts();
      } else {
        showError(data.error || '上传失败');
      }
    } catch (err) {
      showError('上传失败');
    } finally {
      setUploading(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 上传产品图片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = uploadImageProductIdRef.current;

    if (!file || !productId) return;

    setUploadingImage(productId);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const res = await fetch('/api/ea/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        showSuccess('图片上传成功！');
        fetchUserProducts();
      } else {
        showError(data.error || '上传失败');
      }
    } catch (err) {
      showError('上传失败');
    } finally {
      setUploadingImage(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // 上传表单中的图片
  const handleFormImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(-1); // -1 表示表单上传中

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const res = await fetch('/api/ea/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
        setImagePreview(data.url);
        showSuccess('图片上传成功！');
      } else {
        showError(data.error || '上传失败');
      }
    } catch (err) {
      showError('上传失败');
    } finally {
      setUploadingImage(null);
    }
  };

  // 获取产品类型配置
  const getTypeConfig = (type: string) => {
    return PRODUCT_TYPES.find(t => t.value === type) || PRODUCT_TYPES[0];
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">我的EA产品</h1>
            <p className="text-gray-500 mt-1">管理您上传和销售的产品</p>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="w-4 h-4" />
            上架新产品
          </Button>
        </div>

        {/* 提示信息 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/20">
            <Check className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* 产品列表 */}
        {products.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">还没有上传任何产品</h3>
            <p className="text-gray-500 mb-6">开始上传您的EA产品，让更多用户可以使用</p>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="w-4 h-4" />
              上架第一个产品
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            {products.map((product) => {
              const typeConfig = getTypeConfig(product.productType || 'ea');
              const TypeIcon = typeConfig.icon;
              
              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 ${typeConfig.color} rounded-xl flex items-center justify-center`}>
                          <TypeIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{product.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                              {product.status === 'active' ? (
                                <>
                                  <Eye className="w-3 h-3 mr-1" /> 已上架
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3 mr-1" /> 已下架
                                </>
                              )}
                            </Badge>
                            <Badge variant="outline">{typeConfig.label}</Badge>
                            <Badge variant="outline">{product.platform}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">
                          {product.price === 0 ? '免费' : `${product.price} 币`}
                        </p>
                        {product.salesCount && product.salesCount > 0 && (
                          <p className="text-sm text-gray-500">{product.salesCount} 次销售</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {product.description && (
                      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4">
                      {/* EA 文件 */}
                      <div className="flex items-center gap-2">
                        {product.fileName ? (
                          <>
                            <span className="text-sm text-gray-500">{product.fileName}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFileSelect(product.id)}
                              disabled={uploading === product.id}
                            >
                              {uploading === product.id ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                              <span className="ml-1">更新</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleFileSelect(product.id)}
                            disabled={uploading === product.id}
                          >
                            {uploading === product.id ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            <span className="ml-1">上传EA文件</span>
                          </Button>
                        )}
                      </div>

                      {/* 产品图片 */}
                      <div className="flex items-center gap-2">
                        {product.imageUrl ? (
                          <>
                            <img 
                              src={product.imageUrl} 
                              alt="" 
                              className="w-8 h-8 rounded object-cover border"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImageSelect(product.id)}
                              disabled={uploadingImage === product.id}
                            >
                              {uploadingImage === product.id ? <Spinner className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                              <span className="ml-1">更换</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImageSelect(product.id)}
                            disabled={uploadingImage === product.id}
                          >
                            {uploadingImage === product.id ? <Spinner className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                            <span className="ml-1">上传图片</span>
                          </Button>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/download/${product.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStatus(product)}
                        >
                          {product.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ex4,.ex5,.mq4,.mq5,.dll"
          className="hidden"
          onChange={handleFileUpload}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* 新增/编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? '编辑产品' : '上架新产品'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? '修改产品信息' : '填写产品信息开始销售'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>产品名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入产品名称"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>产品类型 *</Label>
                  <Select value={formData.productType} onValueChange={(v) => setFormData({ ...formData, productType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`w-4 h-4 ${type.color.replace('bg-', 'text-')}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>价格（星球币）*</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0表示免费"
                  />
                </div>
              </div>

              {/* 产品图片 */}
              <div className="space-y-2">
                <Label>产品图片</Label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img 
                          src={imagePreview} 
                          alt="预览" 
                          className="max-w-[200px] max-h-[150px] rounded-lg border"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, imageUrl: '' }));
                            setImagePreview(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">点击下方按钮上传产品图片</p>
                        <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG，最大 5MB</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleFormImageUpload}
                      id="form-image-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('form-image-upload')?.click()}
                      disabled={uploadingImage === -1}
                    >
                      {uploadingImage === -1 ? (
                        <Spinner className="w-4 h-4" />
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {formData.imageUrl ? '更换图片' : '上传图片'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 产品描述 */}
              <div className="space-y-2">
                <Label>产品描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="详细描述产品特点、功能、使用方法..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>交易平台</Label>
                  <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>版本号</Label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>分类</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>功能特点（每行一个）</Label>
                <Textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="自动交易
多货币对冲
风险控制
..."
                  rows={3}
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Spinner className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  {editingProduct ? '保存修改' : '创建产品'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
