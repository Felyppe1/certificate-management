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
    def _dec(val):
        return val._decimal if isinstance(val, LF) else Decimal(str(val))

    def plus(val, other=0):
        return val._reformat(_dec(val) + _dec(other)) if isinstance(val, LF) else float(val) + float(other)

    def minus(val, other=0):
        return val._reformat(_dec(val) - _dec(other)) if isinstance(val, LF) else float(val) - float(other)

    def times(val, other=1):
        return val._reformat(_dec(val) * _dec(other)) if isinstance(val, LF) else float(val) * float(other)

    def divided_by(val, other=1):
        if not isinstance(val, LF):
            return float(val) / float(other)
        # localcontext isola a precisão só aqui, sem afetar round/quantize
        with localcontext() as ctx:
            ctx.prec = len(str(abs(int(val)))) + DIVIDED_BY_PRECISION
            result = _dec(val) / _dec(other)
        return val._reformat(result)

    def modulo(val, other=1):
        return val._reformat(_dec(val) % _dec(other)) if isinstance(val, LF) else float(val) % float(other)

    def round_(val, ndigits=None):
        if not isinstance(val, LF):
            return round(float(val)) if ndigits is None else round(float(val), int(float(ndigits)))
        d = _dec(val)
        if ndigits is None:
            result = d.to_integral_value(rounding=ROUND_HALF_UP)
        else:
            result = d.quantize(Decimal(10) ** -int(float(ndigits)), rounding=ROUND_HALF_UP)
        return val._reformat(result)

    def abs_(val):
        return val._reformat(abs(_dec(val))) if isinstance(val, LF) else abs(float(val))

    def ceil_(val):
        return val._reformat(_dec(val).to_integral_value(rounding=ROUND_CEILING)) if isinstance(val, LF) else float(val).__ceil__()

    def floor_(val):
        return val._reformat(_dec(val).to_integral_value(rounding=ROUND_FLOOR)) if isinstance(val, LF) else float(val).__floor__()

    def at_most(val, other=0):
        return val._reformat(min(_dec(val), _dec(other))) if isinstance(val, LF) else min(float(val), float(other))

    def at_least(val, other=0):
        return val._reformat(max(_dec(val), _dec(other))) if isinstance(val, LF) else max(float(val), float(other))

    return {
        'plus': plus, 'minus': minus, 'times': times,
        'divided_by': divided_by, 'modulo': modulo,
        'round': round_, 'abs': abs_, 'ceil': ceil_, 'floor': floor_,
        'at_most': at_most, 'at_least': at_least,
    }

liquid_environment = Environment()
for name, fn in make_math_filters(LiquidFloat).items():
    liquid_environment.add_filter(name, fn)
