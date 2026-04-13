from decimal import Decimal, ROUND_HALF_UP, ROUND_CEILING, ROUND_FLOOR, localcontext
from datetime import datetime
from liquid import Environment

class LiquidDate(datetime):
    # The __new__ intercepts the creation. We receive a string (display) and the datetime object
    def __new__(cls, display, dt_obj):
        # We feed the super class (datetime) with the integer numbers she needs
        obj = datetime.__new__(
            cls, 
            dt_obj.year, 
            dt_obj.month, 
            dt_obj.day, 
            dt_obj.hour, 
            dt_obj.minute, 
            dt_obj.second
        )
        # Now, we set the custom string in the object created.
        obj.display = display
        return obj

    def __str__(self):
        return self.display

class LiquidFloat(float):
    def __new__(cls, display_value, _math_value=None, _dec_sep=None, _thousands_sep=None):
        # 1. Early Return: if we already passed a mathematical value, construct and return immediately
        if _math_value is not None:
            obj = float.__new__(cls, _math_value)
            obj.display, obj.dec_sep, obj.thousands_sep = display_value, _dec_sep, _thousands_sep
            obj._decimal = Decimal(str(_math_value))
            return obj

        # 2. Parsing Logic (when we only receive the string)
        cleaned = str(display_value).strip()
        last_dot, last_comma = cleaned.rfind('.'), cleaned.rfind(',')
        
        dec_sep, thousands_sep = '.', None

        # Scenario A: The comma comes after the dot (e.g., 1.000,90) OR only has comma
        if last_comma > last_dot: 
            if last_dot == -1 and cleaned.count(',') > 1:
                # US Exception: Only commas and multiple (e.g., 1,000,000)
                dec_sep, thousands_sep = '.', ','
                cleaned = cleaned.replace(',', '')
            else:
                # BR Rule: The comma is the decimal (e.g., 123,456 or 1.000,00)
                dec_sep, thousands_sep = ',', '.'
                cleaned = cleaned.replace('.', '').replace(',', '.')
                
        # Scenario B: The dot comes after the comma (e.g., 1,000.90) OR only has dot
        elif last_dot > last_comma:
            # BR Priority: Only has dot and has thousand format (e.g., 1.000.000 or 123.456)
            if last_comma == -1 and (cleaned.count('.') > 1 or len(cleaned.split('.')[1]) == 3):
                dec_sep, thousands_sep = ',', '.'
                cleaned = cleaned.replace('.', '')
            else:
                # US/Natural Rule: The dot is the decimal (e.g., 12.34 or 1,000.90)
                dec_sep, thousands_sep = '.', ','
                cleaned = cleaned.replace(',', '')

        math_value = float(cleaned)
        obj = float.__new__(cls, math_value)
        obj.display = display_value
        obj.dec_sep = dec_sep
        obj.thousands_sep = thousands_sep
        obj._decimal = Decimal(cleaned)
        
        return obj

    def _reformat(self, decimal_value):
        d_str = f"{decimal_value:f}"
        if '.' in d_str:
            int_raw, dec_raw = d_str.lstrip('-').split('.')
            dec_raw = dec_raw.rstrip('0') or None
        else:
            int_raw = d_str.lstrip('-')
            dec_raw = None

        int_part = self._apply_thousands(int_raw, self.thousands_sep) if self.thousands_sep else int_raw
        prefix = '-' if decimal_value < 0 else ''
        display = f"{prefix}{int_part}{self.dec_sep}{dec_raw}" if dec_raw else f"{prefix}{int_part}"

        result = LiquidFloat.__new__(LiquidFloat, display,
            _math_value=float(decimal_value), _dec_sep=self.dec_sep, _thousands_sep=self.thousands_sep)
        result.display = display
        result._decimal = decimal_value
        return result

    @staticmethod
    def _apply_thousands(int_str, sep):
        parts = []
        for i, d in enumerate(reversed(int_str)):
            if i > 0 and i % 3 == 0:
                parts.append(sep)
            parts.append(d)
        return ''.join(reversed(parts))

    def __str__(self):
        return str(self.display)

DIVIDED_BY_PRECISION = 8

def make_math_filters(LF):

    def _to_decimal(val):
        """
        Converte QUALQUER tipo de entrada para Decimal de forma segura.
        Aceita: LiquidFloat, int, float, str numérica, Decimal, bool.
        Retorna Decimal(0) se não for conversível (comportamento padrão do Liquid).
        """
        if isinstance(val, LF):
            return val._decimal
        if isinstance(val, bool):
            # bool é subclasse de int em Python; True=1, False=0
            return Decimal(int(val))
        if isinstance(val, Decimal):
            return val
        try:
            return Decimal(str(val).strip())
        except Exception:
            return Decimal(0)

    def _output(original_val, result_decimal):
        """
        Decide o tipo de retorno baseado no valor ORIGINAL que entrou no filtro:

        - LiquidFloat → preserva display + separadores via _reformat()
        - qualquer outro → int se resultado for inteiro, float caso contrário

        Isso garante que o valor de saída seja sempre compatível com o próximo
        filtro na cadeia (ex: date aceita int mas não float).
        """
        if isinstance(original_val, LF):
            return original_val._reformat(result_decimal)
        # Para tipos nativos, preserva semântica: inteiro → int, decimal → float
        if result_decimal == result_decimal.to_integral_value():
            return int(result_decimal)
        return float(result_decimal)

    # ── Filtros ───────────────────────────────────────────────────────────────

    def plus(val, other=0):
        return _output(val, _to_decimal(val) + _to_decimal(other))

    def minus(val, other=0):
        return _output(val, _to_decimal(val) - _to_decimal(other))

    def times(val, other=1):
        return _output(val, _to_decimal(val) * _to_decimal(other))

    def divided_by(val, other=1):
        d_val, d_other = _to_decimal(val), _to_decimal(other)
        if isinstance(val, LF):
            with localcontext() as ctx:
                ctx.prec = len(str(abs(int(val)))) + DIVIDED_BY_PRECISION
                result = d_val / d_other
        else:
            with localcontext() as ctx:
                ctx.prec = DIVIDED_BY_PRECISION
                result = d_val / d_other
        return _output(val, result)

    def modulo(val, other=1):
        return _output(val, _to_decimal(val) % _to_decimal(other))

    def round_(val, ndigits=None):
        d = _to_decimal(val)
        if ndigits is None:
            result = d.to_integral_value(rounding=ROUND_HALF_UP)
        else:
            result = d.quantize(Decimal(10) ** -int(float(ndigits)), rounding=ROUND_HALF_UP)
        return _output(val, result)

    def abs_(val):
        return _output(val, abs(_to_decimal(val)))

    def ceil_(val):
        return _output(val, _to_decimal(val).to_integral_value(rounding=ROUND_CEILING))

    def floor_(val):
        return _output(val, _to_decimal(val).to_integral_value(rounding=ROUND_FLOOR))

    def at_most(val, other=0):
        return _output(val, min(_to_decimal(val), _to_decimal(other)))

    def at_least(val, other=0):
        return _output(val, max(_to_decimal(val), _to_decimal(other)))

    return {
        'plus': plus, 'minus': minus, 'times': times,
        'divided_by': divided_by, 'modulo': modulo,
        'round': round_, 'abs': abs_, 'ceil': ceil_, 'floor': floor_,
        'at_most': at_most, 'at_least': at_least,
    }

liquid_environment = Environment()
for name, fn in make_math_filters(LiquidFloat).items():
    liquid_environment.add_filter(name, fn)
