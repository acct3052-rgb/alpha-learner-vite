"""
IQ Option Bridge Server

Servidor Python Flask que conecta à IQ Option usando iqoptionapi
e expõe endpoints REST para o frontend JavaScript.

ATENÇÃO: Use por sua conta e risco. A API não é oficial.

Instalação:
    pip install iqoptionapi flask flask-cors

Uso:
    python python_bridge/iqoption_server.py
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import time
import sys
import logging

# Tentar importar iqoptionapi
try:
    from iqoptionapi.stable_api import IQ_Option
    IQOPTION_AVAILABLE = True
except ImportError:
    IQOPTION_AVAILABLE = False
    print("❌ ERRO: iqoptionapi não está instalado!")
    print("📦 Instale com: pip install iqoptionapi")

app = Flask(__name__)
CORS(app)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Variável global para manter conexão
iq = None
is_connected = False

@app.route('/api/health', methods=['GET'])
def health_check():
    """Verificar se o servidor está rodando"""
    return jsonify({
        'status': 'online',
        'iqoptionapi_available': IQOPTION_AVAILABLE,
        'connected': is_connected
    })

@app.route('/api/connect', methods=['POST'])
def connect():
    """Conectar à IQ Option"""
    global iq, is_connected
    
    if not IQOPTION_AVAILABLE:
        return jsonify({
            'success': False,
            'message': 'iqoptionapi não está instalado. Execute: pip install iqoptionapi'
        }), 500
    
    data = request.json
    email = data.get('email')
    password = data.get('password')
    practice = data.get('practice', True)
    
    if not email or not password:
        return jsonify({
            'success': False,
            'message': 'Email e senha são obrigatórios'
        }), 400
    
    try:
        logger.info(f'Tentando conectar com email: {email}')
        iq = IQ_Option(email, password)
        check, reason = iq.connect()
        
        if check:
            # Mudar para conta demo ou real
            balance_type = 'PRACTICE' if practice else 'REAL'
            iq.change_balance(balance_type)
            is_connected = True
            
            logger.info(f'✅ Conectado com sucesso! Modo: {balance_type}')
            
            return jsonify({
                'success': True,
                'message': f'Conectado com sucesso em modo {balance_type}',
                'balance_type': balance_type
            })
        else:
            logger.error(f'❌ Falha na conexão: {reason}')
            return jsonify({
                'success': False,
                'message': f'Falha na conexão: {reason}'
            }), 400
    except Exception as e:
        logger.error(f'❌ Erro ao conectar: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Erro ao conectar: {str(e)}'
        }), 500

@app.route('/api/disconnect', methods=['POST'])
def disconnect():
    """Desconectar da IQ Option"""
    global iq, is_connected
    
    try:
        if iq:
            # A biblioteca não tem método disconnect explícito
            iq = None
            is_connected = False
            logger.info('✅ Desconectado')
            
        return jsonify({
            'success': True,
            'message': 'Desconectado com sucesso'
        })
    except Exception as e:
        logger.error(f'❌ Erro ao desconectar: {str(e)}')
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/balance', methods=['GET'])
def get_balance():
    """Obter saldo da conta"""
    global iq
    
    if not iq or not is_connected:
        return jsonify({'error': 'Não conectado'}), 400
    
    try:
        balance = iq.get_balance()
        logger.info(f'💰 Saldo: ${balance}')
        
        return jsonify({
            'balance': balance,
            'currency': 'USD'
        })
    except Exception as e:
        logger.error(f'❌ Erro ao obter saldo: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/candles', methods=['POST'])
def get_candles():
    """Obter candles (velas) históricos"""
    global iq
    
    if not iq or not is_connected:
        return jsonify({'error': 'Não conectado'}), 400
    
    data = request.json
    active = data.get('active', 'EURUSD')
    size = data.get('size', 60)  # 1 minuto
    count = data.get('count', 100)
    
    try:
        # Obter timestamp atual
        end_time = time.time()
        
        logger.info(f'📊 Buscando {count} candles de {active} ({size}s)')
        
        candles = iq.get_candles(active, size, count, end_time)
        
        if not candles:
            return jsonify({
                'error': f'Nenhum candle retornado para {active}'
            }), 404
        
        logger.info(f'✅ Retornados {len(candles)} candles')
        
        return jsonify({
            'candles': candles,
            'active': active,
            'size': size,
            'count': len(candles)
        })
    except Exception as e:
        logger.error(f'❌ Erro ao obter candles: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/actives', methods=['GET'])
def get_actives():
    """Obter lista de ativos disponíveis"""
    global iq
    
    if not iq or not is_connected:
        return jsonify({'error': 'Não conectado'}), 400
    
    try:
        # Obter todos os ativos
        all_actives = iq.get_all_open_time()
        
        # Filtrar apenas os que estão abertos
        open_actives = []
        for active_id, active_data in all_actives.items():
            if active_data.get('open', False):
                open_actives.append({
                    'id': active_id,
                    'name': active_data.get('name', active_id),
                    'enabled': active_data.get('enabled', False)
                })
        
        logger.info(f'✅ {len(open_actives)} ativos disponíveis')
        
        return jsonify({
            'actives': open_actives,
            'count': len(open_actives)
        })
    except Exception as e:
        logger.error(f'❌ Erro ao obter ativos: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/trade', methods=['POST'])
def make_trade():
    """Fazer uma operação"""
    global iq
    
    if not iq or not is_connected:
        return jsonify({'error': 'Não conectado'}), 400
    
    data = request.json
    active = data.get('active')
    amount = data.get('amount')
    direction = data.get('direction')  # 'call' ou 'put'
    duration = data.get('duration', 1)  # minutos
    
    if not all([active, amount, direction]):
        return jsonify({
            'error': 'Parâmetros obrigatórios: active, amount, direction'
        }), 400
    
    if direction not in ['call', 'put']:
        return jsonify({
            'error': 'direction deve ser "call" ou "put"'
        }), 400
    
    try:
        logger.info(f'📈 Executando trade: {direction.upper()} {active} ${amount} por {duration}min')
        
        # Fazer a operação
        status, order_id = iq.buy(amount, active, direction, duration)
        
        if status:
            logger.info(f'✅ Trade executado! Order ID: {order_id}')
            
            return jsonify({
                'success': True,
                'order_id': order_id,
                'active': active,
                'amount': amount,
                'direction': direction,
                'duration': duration
            })
        else:
            logger.error('❌ Falha ao executar trade')
            return jsonify({
                'success': False,
                'message': 'Falha na operação'
            }), 400
    except Exception as e:
        logger.error(f'❌ Erro ao fazer trade: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/positions', methods=['GET'])
def get_positions():
    """Obter operações abertas"""
    global iq
    
    if not iq or not is_connected:
        return jsonify({'error': 'Não conectado'}), 400
    
    try:
        # A biblioteca iqoptionapi não tem método direto para isso
        # Retornar array vazio por enquanto
        logger.info('📊 Buscando posições abertas')
        
        return jsonify({
            'positions': [],
            'message': 'Funcionalidade em desenvolvimento'
        })
    except Exception as e:
        logger.error(f'❌ Erro ao obter posições: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Obter histórico de operações"""
    global iq
    
    if not iq or not is_connected:
        return jsonify({'error': 'Não conectado'}), 400
    
    count = request.args.get('count', 50, type=int)
    
    try:
        logger.info(f'📊 Buscando histórico ({count} operações)')
        
        # A biblioteca pode ter método específico para histórico
        # Por enquanto retornar array vazio
        return jsonify({
            'history': [],
            'count': 0,
            'message': 'Funcionalidade em desenvolvimento'
        })
    except Exception as e:
        logger.error(f'❌ Erro ao obter histórico: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    """Página inicial"""
    status = '🟢 Online' if is_connected else '🔴 Offline'
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>IQ Option Bridge Server</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
            }}
            .status {{
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            h1 {{ color: #333; }}
            .online {{ color: green; }}
            .offline {{ color: red; }}
        </style>
    </head>
    <body>
        <div class="status">
            <h1>🌉 IQ Option Bridge Server</h1>
            <p><strong>Status:</strong> {status}</p>
            <p><strong>iqoptionapi:</strong> {'✅ Instalado' if IQOPTION_AVAILABLE else '❌ Não instalado'}</p>
            <h2>Endpoints Disponíveis:</h2>
            <ul>
                <li>POST /api/connect - Conectar</li>
                <li>POST /api/disconnect - Desconectar</li>
                <li>GET /api/balance - Obter saldo</li>
                <li>POST /api/candles - Obter candles</li>
                <li>GET /api/actives - Listar ativos</li>
                <li>POST /api/trade - Fazer operação</li>
                <li>GET /api/positions - Posições abertas</li>
                <li>GET /api/history - Histórico</li>
            </ul>
        </div>
    </body>
    </html>
    """
    return html

if __name__ == '__main__':
    print('=' * 50)
    print('🌉 IQ Option Bridge Server')
    print('=' * 50)
    
    if not IQOPTION_AVAILABLE:
        print('\n❌ ERRO: iqoptionapi não está instalado!')
        print('📦 Instale com: pip install iqoptionapi')
        print('\n⚠️  O servidor vai iniciar, mas não funcionará corretamente.')
        print('=' * 50)
    else:
        print('\n✅ iqoptionapi está instalado')
        print('=' * 50)
    
    print('\n🚀 Iniciando servidor em http://localhost:5000')
    print('📖 Documentação: Veja IQOPTION_SETUP.md')
    print('\n⚠️  AVISO: Use por sua conta e risco!')
    print('=' * 50)
    print()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
